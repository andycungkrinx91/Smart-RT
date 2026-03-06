export const fetchPublicData = async (endpoint: string) => {
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  const url = `/api${normalizedEndpoint}`

  try {
    const response = await fetch(url, {
      method: 'GET',
      referrerPolicy: 'no-referrer',
      headers: {
        accept: 'application/json',
      },
      next: { revalidate: 3600 },
    })
    if (!response.ok) throw new Error('Failed to fetch data')
    return response.ok ? response.json() : null
  } catch {
    return null
  }
}
