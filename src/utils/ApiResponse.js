/**
 * ApiResponse — Standardized JSON Response Wrapper
 *
 * Ensures all API responses follow a consistent shape:
 * { success: true/false, message: "...", data: {...}, meta: {...} }
 */

class ApiResponse {
  /**
   * Success response
   * @param {object} res - Express response object
   * @param {object|array} data - Payload data
   * @param {string} [message='Success'] - Human-readable message
   * @param {number} [statusCode=200] - HTTP status code
   * @param {object} [meta] - Optional metadata (pagination, etc.)
   */
  static success(res, data, message = 'Success', statusCode = 200, meta = null) {
    const response = {
      success: true,
      message,
      data,
    };
    if (meta) response.meta = meta;
    return res.status(statusCode).json(response);
  }

  /**
   * Created response (201)
   */
  static created(res, data, message = 'Created successfully') {
    return ApiResponse.success(res, data, message, 201);
  }

  /**
   * Paginated response
   */
  static paginated(res, data, pagination, message = 'Success') {
    return res.status(200).json({
      success: true,
      message,
      data,
      meta: {
        pagination,
      },
    });
  }

  /**
   * No content response (204)
   */
  static noContent(res) {
    return res.status(204).send();
  }
}

module.exports = ApiResponse;
