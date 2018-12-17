import { HttpClient, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import * as URL from 'url-parse';
const parse = URL;
import { RemoteHttpServiceMapping, TraceRoot, TraceParticipationStrategy } from './types';
import { Observable } from 'rxjs';

/**
 * An interceptor for tracing calls made with Angular's {@link HttpClient}.
 */
export abstract class TracingHttpInterceptor<T extends TraceRoot<R>, R extends any = any> implements HttpInterceptor {
  protected constructor(
    protected remoteServiceMappings: RemoteHttpServiceMapping,
    protected traceRoot: T,
    protected participationStrategy: TraceParticipationStrategy
  ) {}

  /**
   * Prefixes requests without a url as localhost.
   *
   * @param request
   */
  static normalizeUrl(request: HttpRequest<any>) {
    return !request.url.startsWith('http') ? `http://localhost${request.url}` : request.url;
  }

  /**
   * Intercepts the request. The request will be traced depending on the participation strategy.
   *
   * @param req
   * @param next
   */
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    let span: R | undefined = this.traceRoot.get();
    if (!span && this.participationStrategy === TraceParticipationStrategy.CHILD_ONLY) {
      return next.handle(req);
    } else {
      span = this.traceRoot.getOrCreate();
    }

    const url = TracingHttpInterceptor.normalizeUrl(req);
    const remoteService = this.getRemoteServiceName(url);
    if (!remoteService) {
      return next.handle(req);
    }

    return this.doIntercept(span, url, remoteService, req, next);
  }

  /**
   * Extension point for subclasses to add their specific trace logic.
   *
   * @param span
   * @param url
   * @param remoteService
   * @param req
   * @param next
   */
  protected abstract doIntercept(span: R, url: string, remoteService: string, req: HttpRequest<any>, next: HttpHandler);

  /**
   * Gets the remote service from the configuration. If the remote service is a string, then
   * an exact match is checked otherwise the regular expression is tested.
   *
   * @param reqUrl The URL to check
   */
  protected getRemoteServiceName(reqUrl: string): string | undefined {
    const url = parse(reqUrl);
    if (url.hostname) {
      return undefined;
    }

    return Object.keys(this.remoteServiceMappings).find(remoteService => {
      const domain = this.remoteServiceMappings[remoteService];
      return ((domain !== undefined && typeof domain === 'string' && domain === url.hostname) ||
        (domain instanceof RegExp && url.hostname && domain.test(url.hostname))) as boolean;
    });
  }
}
