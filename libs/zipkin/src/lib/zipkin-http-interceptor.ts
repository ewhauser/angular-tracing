import { HttpClient, HttpEvent, HttpHandler, HttpRequest, HttpResponse } from '@angular/common/http';
import { of } from 'rxjs';
import * as zipkin from 'zipkin';
import { catchError, tap } from 'rxjs/operators';
import ZipkinHttpClient = zipkin.Instrumentation.HttpClient;

import { ZipkinTraceRoot } from './zipkin-trace-root';
import { Tracer } from 'zipkin';

import {
  RemoteHttpServiceMapping,
  TRACE_HTTP_PARTICIPATION_STRATEGY,
  TRACE_LOCAL_SERVICE_NAME,
  TraceParticipationStrategy,
  TracingHttpInterceptor
} from '@angular-tracing/core';
import { Inject, Injectable } from '@angular/core';

/**
 * Traces calls to Angular's {@link HttpClient}
 */
@Injectable({
  providedIn: 'root'
})
export class ZipkinHttpInterceptor extends TracingHttpInterceptor<ZipkinTraceRoot, Tracer> {
  constructor(
    protected remoteServiceMappings: RemoteHttpServiceMapping,
    protected traceContext: ZipkinTraceRoot,
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

    httpClient.recordRequest(req, url, req.method);
    const traceId = tracer.id;
    return next.handle(req).pipe(
      tap((event: HttpEvent<any>) => {
        if (event instanceof HttpResponse) {
          httpClient.recordResponse(traceId, event.status.toString());
        }
      }),
      catchError((err: any, caught: any) => {
        httpClient.recordError(traceId, err);
        return of(caught);
      })
    );
  }
}
