import { HttpEvent, HttpHandler, HttpRequest, HttpResponse } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';

import { throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import * as zipkin from 'zipkin';
import { Tracer } from 'zipkin';
import ZipkinHttpClient = zipkin.Instrumentation.HttpClient;

import {
  TRACE_HTTP_PARTICIPATION_STRATEGY,
  TRACE_HTTP_REMOTE_MAPPINGS,
  TRACE_LOCAL_SERVICE_NAME,
  TRACE_ROOT_TOKEN
} from './injection-tokens';
import { TracingHttpInterceptor } from './tracing-http-interceptor';
import { RemoteHttpServiceMapping, TraceParticipationStrategy } from './types';
import { ZipkinTraceRoot } from './zipkin-trace-root';

/**
 * Traces calls to Angular's {@link HttpClient}
 */
@Injectable({
  providedIn: 'root'
})
export class ZipkinHttpInterceptor extends TracingHttpInterceptor<ZipkinTraceRoot, Tracer> {
  constructor(
    @Inject(TRACE_HTTP_REMOTE_MAPPINGS) protected remoteServiceMappings: RemoteHttpServiceMapping,
    @Inject(TRACE_ROOT_TOKEN) protected traceContext: ZipkinTraceRoot,
    @Inject(TRACE_LOCAL_SERVICE_NAME) protected serviceName: string,
    @Inject(TRACE_HTTP_PARTICIPATION_STRATEGY) protected participationStrategy: TraceParticipationStrategy
  ) {
    super(remoteServiceMappings, traceContext, participationStrategy);
  }

  protected doIntercept(
    tracer: Tracer,
    url: string,
    remoteServiceName: string,
    req: HttpRequest<any>,
    next: HttpHandler
  ) {
    const httpClient = new ZipkinHttpClient({
      remoteServiceName,
      serviceName: this.serviceName,
      tracer
    });

    const request = {
      url: req.url,
      headers: {}
    };
    const zipkinReq = httpClient.recordRequest(request, url, req.method);
    const zipkinHeaders = zipkinReq.headers as any;

    req = req.clone({
      setHeaders: zipkinHeaders
    });

    const traceId = tracer.id;
    return next.handle(req).pipe(
      tap((event: HttpEvent<any>) => {
        if (event instanceof HttpResponse) {
          httpClient.recordResponse(traceId, event.status.toString());
        }
      }),
      catchError((err: any) => {
        httpClient.recordError(traceId, err);
        return throwError(err);
      })
    );
  }
}
