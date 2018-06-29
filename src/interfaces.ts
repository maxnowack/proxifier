import * as http from 'http'

export interface Configuration {
  match(clientToProxyRequest: http.IncomingMessage): boolean,
  request?(
    data: string,
    clientToProxyRequest: any,
    proxyToServerRequest: any): Promise<void>,
  response?(
    data: string,
    serverToProxyResponse: any,
    proxyToClientResponse: any): Promise<void>,
}
