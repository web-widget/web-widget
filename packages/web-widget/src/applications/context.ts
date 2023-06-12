export const getContext = async (url: string): Promise<any> => {
  const response = await fetch(url, {
    headers: {
      accept: 'application/json',
      'X-Web-Widget': 'context'
    }
  })
  if (!response.ok) {
    throw new Error(`HTTP: ${response.status}: ${response.statusText}`);
  }
  return response.json();
}

export const createContextResponse = async (context: Record<string, any>) => {
  return new Response(JSON.stringify(context), {
    status: 200,
    statusText: 'OK',
    headers: {
      'Content-Type': 'application/json',
      'X-Web-Widget': 'context'
    }
  })
}

export const isContextRequest = (request: Request) => {
  const { headers } = request
  const isJson = headers.get('accept') === 'application/json'
  const isWebWidgetClient = headers.get('X-Web-Widget') === 'context'
  const isOrigin = headers.get('referrer') === request.url
  return isJson && isWebWidgetClient && isOrigin
}