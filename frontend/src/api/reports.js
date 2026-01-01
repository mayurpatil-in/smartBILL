import api from './axios';

export const getJobWorkReport = async () => {
    const response = await api.get('/reports/job-work');
    return response.data;
};

export const getStockLedgerPDF = async (partyId) => {
    const params = partyId ? { party_id: partyId } : {};
    const response = await api.get('/reports/ledger/pdf', {
        params,
        responseType: 'blob'
    });
    return response.data;
};
