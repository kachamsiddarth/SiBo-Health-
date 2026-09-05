export type HealthResponse = {
  status: string
  service: string
}

export async function getHealthStatus(): Promise<HealthResponse> {
  const response = await fetch('/api/health', {
    method: 'GET',
    headers: {
      Accept: 'application/json'
    }
  })

  if (!response.ok) {
    throw new Error(`Health check failed with status ${response.status}`)
  }

  return (await response.json()) as HealthResponse
}
