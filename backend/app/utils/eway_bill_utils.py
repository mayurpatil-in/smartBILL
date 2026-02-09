"""E-Way Bill utility functions for validation and calculations"""

from decimal import Decimal
from typing import Tuple


def validate_eway_bill_eligibility(invoice_amount: Decimal) -> bool:
    """
    Check if invoice amount requires e-way bill (>= 50000)
    
    Args:
        invoice_amount: Total invoice amount
        
    Returns:
        True if e-way bill is required, False otherwise
    """
    return invoice_amount >= Decimal("50000")


def calculate_eway_bill_validity(distance: int) -> Tuple[int, str]:
    """
    Calculate validity period based on distance
    
    Rules:
    - < 100km: 1 day
    - 100-300km: 3 days  
    - 300-1000km: 1 day per 100km (rounded up)
    - > 1000km: 15 days
    
    Args:
        distance: Transport distance in kilometers
        
    Returns:
        Tuple of (validity_days, validity_description)
    """
    if distance < 100:
        return (1, "1 day (< 100 km)")
    elif distance < 300:
        return (3, "3 days (100-300 km)")
    elif distance < 1000:
        # 1 day per 100km, rounded up
        days = (distance + 99) // 100  # Ceiling division
        return (days, f"{days} days ({distance} km)")
    else:
        return (15, "15 days (> 1000 km)")


def format_hsn_code(hsn: str) -> str:
    """
    Format HSN code to minimum 4 digits as required by GST
    
    Args:
        hsn: HSN code string
        
    Returns:
        Formatted HSN code (minimum 4 digits)
    """
    if not hsn:
        return ""
    
    # Remove any non-digit characters
    hsn_digits = ''.join(filter(str.isdigit, hsn))
    
    # Pad with zeros if less than 4 digits
    if len(hsn_digits) < 4:
        hsn_digits = hsn_digits.zfill(4)
    
    return hsn_digits


def get_transport_mode_options():
    """Get valid transport mode options for e-way bill"""
    return [
        {"value": "Road", "label": "Road"},
        {"value": "Rail", "label": "Rail"},
        {"value": "Air", "label": "Air"},
        {"value": "Ship", "label": "Ship"}
    ]


def get_vehicle_type_options():
    """Get valid vehicle type options for e-way bill"""
    return [
        {"value": "Regular", "label": "Regular"},
        {"value": "ODC", "label": "Over Dimensional Cargo (ODC)"}
    ]


# GST State Codes mapping
GST_STATE_CODES = {
    "01": "Jammu and Kashmir",
    "02": "Himachal Pradesh",
    "03": "Punjab",
    "04": "Chandigarh",
    "05": "Uttarakhand",
    "06": "Haryana",
    "07": "Delhi",
    "08": "Rajasthan",
    "09": "Uttar Pradesh",
    "10": "Bihar",
    "11": "Sikkim",
    "12": "Arunachal Pradesh",
    "13": "Nagaland",
    "14": "Manipur",
    "15": "Mizoram",
    "16": "Tripura",
    "17": "Meghalaya",
    "18": "Assam",
    "19": "West Bengal",
    "20": "Jharkhand",
    "21": "Odisha",
    "22": "Chhattisgarh",
    "23": "Madhya Pradesh",
    "24": "Gujarat",
    "25": "Daman and Diu",
    "26": "Dadra and Nagar Haveli",
    "27": "Maharashtra",
    "28": "Andhra Pradesh (Old)",
    "29": "Karnataka",
    "30": "Goa",
    "31": "Lakshadweep",
    "32": "Kerala",
    "33": "Tamil Nadu",
    "34": "Puducherry",
    "35": "Andaman and Nicobar Islands",
    "36": "Telangana",
    "37": "Andhra Pradesh (New)",
    "38": "Ladakh"
}


def get_state_name(state_code: str) -> str:
    """
    Get state name from GST state code
    
    Args:
        state_code: 2-digit GST state code
        
    Returns:
        State name or empty string if not found
    """
    return GST_STATE_CODES.get(state_code, "")


def validate_gstin(gstin: str) -> bool:
    """
    Basic validation for GSTIN format
    
    Format: 2 digits (state) + 10 alphanumeric (PAN) + 1 alpha + 1 alpha/digit + 1 alpha
    Total: 15 characters
    
    Args:
        gstin: GSTIN string to validate
        
    Returns:
        True if format is valid, False otherwise
    """
    if not gstin or len(gstin) != 15:
        return False
    
    # Check if first 2 characters are digits (state code)
    if not gstin[:2].isdigit():
        return False
    
    # Check if state code is valid
    if gstin[:2] not in GST_STATE_CODES:
        return False
    
    return True
