import apiClient from './api';

/**
 * SOCX API Proxy Utility
 * All requests to SOCX API go through backend proxy
 */

/**
 * Generic proxy request to SOCX API
 * @param {string} method - HTTP method (GET, POST, PATCH, DELETE)
 * @param {string} endpoint - SOCX API endpoint (e.g., '/api/v1/suppliers')
 * @param {object} data - Request body data (for POST, PATCH)
 * @returns {Promise} Response from SOCX API
 */
export const socxProxyRequest = async (method, endpoint, data = null) => {
  const response = await apiClient.request('/socx/proxy/request', {
    method: 'POST',
    body: JSON.stringify({
      method,
      endpoint,
      data
    })
  });
  
  console.log('SOCX API Proxy Response:', {
    method,
    endpoint,
    response
  });
  
  return response;
};

/**
 * GET request to SOCX API via proxy
 * @param {string} endpoint - SOCX API endpoint
 * @returns {Promise} Response from SOCX API
 */
export const socxGet = async (endpoint) => {
  return await socxProxyRequest('GET', endpoint);
};

/**
 * POST request to SOCX API via proxy
 * @param {string} endpoint - SOCX API endpoint
 * @param {object} data - Request body data
 * @returns {Promise} Response from SOCX API
 */
export const socxPost = async (endpoint, data) => {
  return await socxProxyRequest('POST', endpoint, data);
};

/**
 * PATCH request to SOCX API via proxy
 * @param {string} endpoint - SOCX API endpoint
 * @param {object} data - Request body data
 * @returns {Promise} Response from SOCX API
 */
export const socxPatch = async (endpoint, data) => {
  return await socxProxyRequest('PATCH', endpoint, data);
};

/**
 * DELETE request to SOCX API via proxy
 * @param {string} endpoint - SOCX API endpoint
 * @returns {Promise} Response from SOCX API
 */
export const socxDelete = async (endpoint) => {
  return await socxProxyRequest('DELETE', endpoint);
};

/**
 * Get SOCX base URL from backend settings
 * @returns {Promise} Base URL for SOCX API
 */
export const getSocxBaseUrl = async () => {
  const response = await apiClient.request('/socx/proxy/base-url');
  return response.data.baseUrl;
};

/**
 * Batch multiple requests to SOCX API
 * @param {Array} requests - Array of {method, endpoint, data}
 * @returns {Promise} Array of responses
 */
export const socxBatchRequest = async (requests) => {
  const promises = requests.map(req => 
    socxProxyRequest(req.method, req.endpoint, req.data)
  );
  return await Promise.all(promises);
};

const socxApi = {
  socxProxyRequest,
  socxGet,
  socxPost,
  socxPatch,
  socxDelete,
  getSocxBaseUrl,
  socxBatchRequest
};

export default socxApi;
