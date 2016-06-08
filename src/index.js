import Proxy from 'http-mitm-proxy'

export class Proxifier {
  constructor(opts) {
    this.options = Object.assign({
      port: 8080,
    }, opts)
    this.proxy = new Proxy()
    this.proxy.onError((ctx, err, errorKind) => {
      const url = (ctx && ctx.clientToProxyRequest) ? ctx.clientToProxyRequest.url : '';
      if (!url) return
      console.error(`${errorKind} on ${url}:`, err);
    });
  }
  start() {
    return new Promise((resolve, reject) => {
      this.proxy.listen({
        silent: true,
        forceSNI: true,
        port: this.options.port,
      }, (err) => {
        if (err) {
          reject(err)
          return
        }
        resolve()
      })
    })
  }
  stop() {
    this.proxy.close()
  }
  configure(config) {
    const getData = (context, what, callback) => {
      const type = what.charAt(0).toUpperCase() + what.slice(1);
      const chunks = []
      context[`on${type}Data`]((ctx, chunk, done) => {
        chunks.push(chunk);
        return done(null, null)
      })
      context[`on${type}End`]((ctx, done) => {
        const data = Buffer.concat(chunks).toString()
        if (type === 'Request') {
          callback(data, ctx.clientToProxyRequest, ctx.proxyToServerRequest, done)
        }
        if (type === 'Response') {
          callback(data, ctx.serverToProxyResponse, ctx.proxyToClientResponse, done)
        }
      })
    }

    this.proxy.onRequest((context, done) => {
      if (config.match && !config.match(context.clientToProxyRequest)) return done()
      context.use(Proxy.gunzip);

      if (config.request) getData(context, 'request', config.request)
      if (config.response) getData(context, 'response', config.response)

      return done()
    })
  }
}
