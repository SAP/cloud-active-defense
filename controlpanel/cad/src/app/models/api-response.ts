export interface ApiResponse {
    type: 'success' | 'error' | 'warning',
    code?: number,
    message: string,
    action?: string,
    data?: unknown
}