import * as http from 'http'

export interface Configuration {
  match(clientToProxyRequest: http.IncomingMessage): boolean,
  request?(
    data: Buffer,
    clientToProxyRequest: any,
    proxyToServerRequest: any): Promise<boolean>,
  response?(
    data: Buffer,
    serverToProxyResponse: any,
    proxyToClientResponse: any,
    clientToProxyRequest?: any,
    proxyToServerRequest?: any): Promise<boolean>,
}
