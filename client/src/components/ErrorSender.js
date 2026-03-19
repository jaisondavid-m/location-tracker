export const getErrorMessage = (error) => {
    return (
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.message ||
        "Network error. Check the server and baseURL"
    )
}