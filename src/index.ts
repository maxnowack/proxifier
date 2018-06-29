import * as proxy from 'http-mitm-proxy'
import { Configuration } from './interfaces'

export default class Proxifier {
  private options: proxy.IProxyOptions = {}
  private proxy = proxy()
  private configs: Configuration[] = []
  constructor(opts: proxy.IProxyOptions) {
    this.options = {
      forceSNI: true,
      port: 8080,
      silent: true,
      ...opts,
    }

    this.proxy.onError((ctx, err) => {
      const url = (ctx && ctx.clientToProxyRequest) ? ctx.clientToProxyRequest.url : ''
      if (!url) return
      throw new Error(`${err ? err.message : 'unknown error'} on ${url}`)
    })

    this.proxy.onRequest((context, done) => {
      const matches = this.configs.map(config => config.match(context.clientToProxyRequest))
      if (matches.includes(true)) { // at least one match
        context.use(proxy.gunzip)

        const requestChunks: Buffer[] = []
        context.onRequestData((ctx, chunk, requestChunkDone) => {
          requestChunks.push(chunk)
          return requestChunkDone()
        })
        context.onRequestEnd((ctx, requestDone) => {
          const data = Buffer.concat(requestChunks).toString()
          Promise.all(this.configs.map(config => {
            if (!config.match(context.clientToProxyRequest) || !config.request) return new Promise<void>(r => r())
            return config.request(data, ctx.clientToProxyRequest, ctx.proxyToServerRequest)
          })).then(() => {
            requestDone()
          })
        })

        const responseChunks: Buffer[] = []
        context.onResponseData((ctx, chunk, responseChunkDone) => {
          responseChunks.push(chunk)
          return responseChunkDone()
        })
        context.onResponseEnd((ctx, responseDone) => {
          const data = Buffer.concat(responseChunks).toString()
          Promise.all(this.configs.map(config => {
            if (!config.match(context.clientToProxyRequest) || !config.response) return new Promise<void>(r => r())
            return config.response(data, ctx.serverToProxyResponse, ctx.proxyToClientResponse)
          })).then(() => {
            responseDone()
          })
        })
      }
      done()
    })
  }

  public start() {
    return new Promise((resolve, reject) => {
      this.proxy.listen(this.options, (err: Error) => {
        if (err) {
          reject(err)
          return
        }
        resolve()
      })
    })
  }

  public stop() {
    this.proxy.close()
  }

  public configure(configs: Configuration[]) {
    this.configs = configs
  }
}
