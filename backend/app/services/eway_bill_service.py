"""
E-Way Bill Service — NIC API Integration
Handles: Authentication, EWB Generation (Online), Token Management
"""
import httpx
import logging
import math
import os
from datetime import datetime, date
from typing import Optional

logger = logging.getLogger(__name__)


class EWayBillService:
    """
    Integrates with the NIC Government E-Way Bill API.

    Two flows are supported from the router:
      1. ONLINE  → generate_eway_bill()  — calls NIC API automatically
      2. OFFLINE → no service call needed — user enters EWB number manually

    API base URLs:
      Sandbox:    https://sandboxapi.einvoice1.gst.gov.in
      Production: https://api.einvoice1.gst.gov.in
    """

    def __init__(self):
        # Lazily load settings so imports are not circular
        self._auth_token: Optional[str] = None
        self._token_obtained_at: Optional[datetime] = None
        # Token is valid for 6 hours per NIC spec
        self._token_validity_seconds = 6 * 60 * 60

    # ─────────────────────────────────────────────────────
    # INTERNAL HELPERS
    # ─────────────────────────────────────────────────────

    def _load_settings(self):
        """Import settings lazily to avoid circular imports at module load."""
        from app.core.config import settings
        return settings

    def _get_base_url(self) -> str:
        s = self._load_settings()
        url = getattr(s, "EWAY_BILL_API_URL", "https://sandboxapi.einvoice1.gst.gov.in")
        return url.rstrip("/")

    def _get_credentials(self) -> tuple[str, str, str]:
        """Returns (username, password, gstin)."""
        s = self._load_settings()
        username = getattr(s, "EWAY_BILL_USERNAME", "")
        password = getattr(s, "EWAY_BILL_PASSWORD", "")
        gstin = getattr(s, "EWAY_BILL_GSTIN", "")
        return username, password, gstin

    def _is_token_valid(self) -> bool:
        """Check if cached token is still within the 6-hour window."""
        if not self._auth_token or not self._token_obtained_at:
            return False
        elapsed = (datetime.now() - self._token_obtained_at).total_seconds()
        return elapsed < self._token_validity_seconds

    def _check_credentials_configured(self):
        """Raise ValueError if API credentials are not set in .env"""
        username, password, gstin = self._get_credentials()
        if not username or not password or not gstin:
            raise ValueError(
                "E-Way Bill API credentials are not configured. "
                "Please set EWAY_BILL_USERNAME, EWAY_BILL_PASSWORD, and "
                "EWAY_BILL_GSTIN in your .env file."
            )

    # ─────────────────────────────────────────────────────
    # STEP 1: AUTHENTICATE
    # ─────────────────────────────────────────────────────

    async def authenticate(self) -> str:
        """
        Authenticate with the NIC EWB API.
        Caches the token for up to 6 hours (re-uses if still valid).

        Returns:
            auth_token (str)
        """
        if self._is_token_valid():
            return self._auth_token  # type: ignore[return-value]

        self._check_credentials_configured()
        username, password, gstin = self._get_credentials()
        base_url = self._get_base_url()

        url = f"{base_url}/ewaybillapi/v1.03/authenticate"

        payload = {
            "action": "ACCESSTOKEN",
            "username": username,
            "password": password,
            "app_key": self._generate_app_key(),
        }

        headers = {
            "Content-Type": "application/json",
            "gstin": gstin,
            "username": username,
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()

        if str(data.get("status")) != "1":
            error = data.get("error", {})
            msg = error.get("message", "Authentication failed")
            code = error.get("errorCodes", "")
            raise ValueError(f"EWB Authentication Error [{code}]: {msg}")

        result = data.get("response", {})
        self._auth_token = result.get("authtoken")
        self._token_obtained_at = datetime.now()

        logger.info("✅ EWB Authentication successful — token cached.")
        return self._auth_token  # type: ignore[return-value]

    @staticmethod
    def _generate_app_key() -> str:
        """Generate a random 32-character alphanumeric app key."""
        import secrets
        import string
        alphabet = string.ascii_letters + string.digits
        return "".join(secrets.choice(alphabet) for _ in range(32))

    # ─────────────────────────────────────────────────────
    # STEP 2: GENERATE E-WAY BILL (ONLINE)
    # ─────────────────────────────────────────────────────

    async def generate_eway_bill(self, payload: dict) -> dict:
        """
        Generate an E-Way Bill via NIC API.

        Args:
            payload: EWB JSON payload built from build_ewb_payload()

        Returns:
            dict containing: ewbNo, ewbDt, validUpto, alert (if any)
        """
        username, _, gstin = self._get_credentials()
        provider = os.getenv("EWAY_BILL_PROVIDER", "NIC").upper()
        
        # MOCK SANDBOX SIMULATOR
        if gstin == "29AAFCC9980M1ZR" and provider == "NIC":
            import random
            from datetime import datetime, timedelta
            logger.info("Running E-Way Bill Sandbox Simulator for dummy GSTIN...")
            return {
                "ewbNo": str(random.randint(100000000000, 999999999999)),
                "ewbDt": datetime.now().strftime("%d/%m/%Y %I:%M:%S %p"),
                "validUpto": (datetime.now() + timedelta(days=1)).strftime("%d/%m/%Y 11:59:00 %p")
            }

        if provider == "GSTZEN":
            logger.info("Using GSTZen GSP for E-Way Bill Generation")
            gstzen_url = os.getenv("EWAY_BILL_API_URL", "https://my.gstzen.in/~gstzen/a/ewbapi/generate/")
            gstzen_token = os.getenv("EWAY_BILL_GSP_TOKEN", "")
            
            headers = {
                "Content-Type": "application/json",
                "gstin": gstin,
                "Token": gstzen_token
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(gstzen_url, json=payload, headers=headers, timeout=30.0)
            
            if response.status_code != 200:
                logger.error(f"GSTZen Error: {response.text}")
                raise ValueError(f"GSTZen Error: {response.text}")
                
            data = response.json()
            
            # GSTZen usually wraps the NIC response or passes it through.
            # We look for the ewbNo in data or data.get('data')
            result_data = data.get("data", data)
            if "ewbNo" not in result_data:
                logger.error(f"GSTZen response missing ewbNo: {data}")
                raise ValueError(f"Failed to extract E-Way bill from GSTZen response: {data}")
                
            return result_data

        # ── DIRECT NIC INTEGRATION ──
        token = await self.authenticate()
        base_url = self._get_base_url()

        url = f"{base_url}/ewaybillapi/v1.03/ewayapi/genewaybill"

        headers = {
            "Content-Type": "application/json",
            "gstin": gstin,
            "username": username,
            "authtoken": token,
        }

        logger.info(f"Calling NIC EWB API: {url}")
        logger.debug(f"EWB Payload: {payload}")

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()

        logger.info(f"NIC EWB Response status: {data.get('status')}")

        if str(data.get("status")) != "1":
            error = data.get("error", {})
            msg = error.get("message", "EWB generation failed")
            code = error.get("errorCodes", "")
            raise ValueError(f"EWB API Error [{code}]: {msg}")

        return data.get("response", {})

    # ─────────────────────────────────────────────────────
    # STEP 3: BUILD PAYLOAD FROM INVOICE DATA
    # ─────────────────────────────────────────────────────

    @staticmethod
    def build_ewb_payload(invoice, company, party, items, transport_data: dict) -> dict:
        """
        Build the NIC EWB API JSON payload from SmartBill invoice data.

        Args:
            invoice:        Invoice SQLAlchemy model instance
            company:        Company SQLAlchemy model instance
            party:          Party SQLAlchemy model instance
            items:          List of InvoiceItem instances (with .item relation loaded)
            transport_data: dict with transport_mode, vehicle_number, transport_distance,
                            transporter_id, vehicle_type, transporter_doc_no, transporter_doc_date

        Returns:
            dict: Complete EWB API payload
        """
        from app.utils.eway_bill_utils import format_hsn_code

        # ── Transport mode code mapping ──────────────────
        transport_mode_map = {"Road": "1", "Rail": "2", "Air": "3", "Ship": "4"}
        transport_mode_code = transport_mode_map.get(
            transport_data.get("transport_mode", "Road"), "1"
        )

        # ── Vehicle type code ─────────────────────────────
        vehicle_type_raw = transport_data.get("vehicle_type", "Regular")
        vehicle_type_code = "O" if vehicle_type_raw == "ODC" else "R"

        # ── State codes ───────────────────────────────────
        company_state = str(company.state_code or "27").zfill(2)  # default Maharashtra
        party_state = str(party.state_code or "27").zfill(2)
        is_interstate = company_state != party_state

        # ── Build item list ───────────────────────────────
        item_list = []
        total_cgst = 0.0
        total_sgst = 0.0
        total_igst = 0.0

        for idx, inv_item in enumerate(items, 1):
            item_obj = inv_item.item
            hsn_raw = getattr(item_obj, "hsn_code", "") or "9999"
            hsn_code = format_hsn_code(str(hsn_raw)) or "9999"

            # Derive GST rate from HSN (common rates: 5, 12, 18, 28)
            # If you add gst_rate to Item model, use that instead
            gst_rate = 18  # fallback default

            taxable_amount = float(inv_item.amount or 0)

            if is_interstate:
                igst = round(taxable_amount * gst_rate / 100, 2)
                cgst = sgst = 0.0
            else:
                igst = 0.0
                cgst = round(taxable_amount * (gst_rate / 2) / 100, 2)
                sgst = round(taxable_amount * (gst_rate / 2) / 100, 2)

            total_igst += igst
            total_cgst += cgst
            total_sgst += sgst

            item_list.append({
                "itemNo": idx,
                "productName": (item_obj.name if item_obj else f"Item {idx}")[:100],
                "productDesc": (item_obj.name if item_obj else f"Item {idx}")[:100],
                "hsnCode": hsn_code,
                "quantity": float(inv_item.quantity or 1),
                "qtyUnit": "NOS",
                "taxableAmount": round(taxable_amount, 2),
                "sgstRate": (gst_rate / 2) if not is_interstate else 0,
                "cgstRate": (gst_rate / 2) if not is_interstate else 0,
                "igstRate": gst_rate if is_interstate else 0,
                "cessRate": 0,
                "cessNonAdvolAmount": 0,
                "taxAmount": round(igst + cgst + sgst, 2),
                "cessAmount": 0,
                "totalValue": round(taxable_amount + igst + cgst + sgst, 2),
            })

        # ── Date formatting (DD/MM/YYYY) ──────────────────
        invoice_date_str = (
            invoice.invoice_date.strftime("%d/%m/%Y") if invoice.invoice_date else ""
        )

        # ── Transporter doc date ──────────────────────────
        trans_doc_date = transport_data.get("transporter_doc_date")
        trans_doc_date_str = (
            trans_doc_date.strftime("%d/%m/%Y")
            if isinstance(trans_doc_date, date)
            else ""
        )

        # ── Address truncation (API limit: 120 chars each) ─
        from_addr = (company.address or "")[:120]
        to_addr = (party.address or "")[:120]

        grand_total = float(invoice.grand_total or 0)

        payload = {
            # ── Transaction Info ────────────────────────
            "supplyType": "O",           # O = Outward supply
            "subSupplyType": "1",        # 1 = Supply
            "docType": "INV",            # INV = Tax Invoice
            "docNo": invoice.invoice_number,
            "docDate": invoice_date_str,
            "transactionType": 1,        # 1 = Regular

            # ── From (Supplier = Company) ───────────────
            "fromGstin": company.gst_number or "",
            "fromTrdName": company.name[:100],
            "fromAddr1": from_addr or "N/A",
            "fromAddr2": "",
            "fromPlace": "",
            "fromPincode": int(getattr(company, "pincode", 400001) or 400001),
            "fromStateCode": int(company_state),
            "actFromStateCode": int(company_state),

            # ── To (Buyer = Party) ──────────────────────
            "toGstin": party.gst_number or "URP",  # URP = Unregistered Person
            "toTrdName": party.name[:100],
            "toAddr1": to_addr or "N/A",
            "toAddr2": "",
            "toPlace": "",
            "toPincode": int(getattr(party, "pincode", 400001) or 400001),
            "toStateCode": int(party_state),
            "actToStateCode": int(party_state),

            # ── Value Summary ───────────────────────────
            "totalValue": round(float(invoice.subtotal or grand_total), 2),
            "cgstValue": round(total_cgst, 2),
            "sgstValue": round(total_sgst, 2),
            "igstValue": round(total_igst, 2),
            "cessValue": 0,
            "cessNonAdvolValue": 0,
            "otherValue": 0,
            "totInvValue": round(grand_total, 2),

            # ── Transport Details ───────────────────────
            "transMode": transport_mode_code,
            "transDistance": str(transport_data.get("transport_distance", 0)),
            "transporterName": "",
            "transporterId": transport_data.get("transporter_id") or "",
            "transDocNo": transport_data.get("transporter_doc_no") or "",
            "transDocDate": trans_doc_date_str,
            "vehicleNo": (transport_data.get("vehicle_number") or "").upper().replace(" ", ""),
            "vehicleType": vehicle_type_code,

            # ── Items ───────────────────────────────────
            "itemList": item_list,
            "mainHsnCode": item_list[0]["hsnCode"] if item_list else "9999",
        }

        return payload

    # ─────────────────────────────────────────────────────
    # CANCEL E-WAY BILL
    # ─────────────────────────────────────────────────────

    async def cancel_eway_bill(
        self,
        ewb_number: str,
        cancel_reason: int = 2,
        cancel_remark: str = "Cancelled",
    ) -> dict:
        """
        Cancel an E-Way Bill via NIC API.
        Must be called within 24 hours of generation.

        cancel_reason codes:
          1 = Duplicate
          2 = Order Cancelled
          3 = Data Entry Mistake
          4 = Others
        """
        token = await self.authenticate()
        username, _, gstin = self._get_credentials()
        base_url = self._get_base_url()

        url = f"{base_url}/ewaybillapi/v1.03/ewayapi/canewb"

        headers = {
            "Content-Type": "application/json",
            "gstin": gstin,
            "username": username,
            "authtoken": token,
        }

        payload = {
            "ewbNo": int(ewb_number),
            "cancelRsnCode": cancel_reason,
            "cancelRmrk": cancel_remark or "Cancelled",
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()

        if str(data.get("status")) != "1":
            error = data.get("error", {})
            msg = error.get("message", "Cancellation failed")
            code = error.get("errorCodes", "")
            raise ValueError(f"EWB Cancel Error [{code}]: {msg}")

        return data.get("response", {})

    # ─────────────────────────────────────────────────────
    # GET E-WAY BILL STATUS
    # ─────────────────────────────────────────────────────

    async def get_eway_bill_status(self, ewb_number: str) -> dict:
        """Fetch current EWB details from NIC portal."""
        token = await self.authenticate()
        username, _, gstin = self._get_credentials()
        base_url = self._get_base_url()

        url = f"{base_url}/ewaybillapi/v1.03/ewayapi/getewaybill"

        headers = {
            "Content-Type": "application/json",
            "gstin": gstin,
            "username": username,
            "authtoken": token,
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, params={"ewbNo": ewb_number}, headers=headers)
            response.raise_for_status()
            data = response.json()

        if str(data.get("status")) != "1":
            error = data.get("error", {})
            msg = error.get("message", "Status check failed")
            code = error.get("errorCodes", "")
            raise ValueError(f"EWB Status Error [{code}]: {msg}")

        return data.get("response", {})


# ── Singleton instance (shared across requests) ──────────────────────────────
eway_bill_service = EWayBillService()
