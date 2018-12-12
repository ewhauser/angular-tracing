import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { NgModule, Provider } from '@angular/core';

import * as zipkin from 'zipkin';
import { BatchRecorder, ConsoleRecorder, jsonEncoder, Recorder } from 'zipkin';
import { HttpLogger } from 'zipkin-transport-http';
import alwaysSample = zipkin.sampler.alwaysSample;
import Sampler = zipkin.sampler.Sampler;

import {
  RemoteHttpServiceMapping,
  TRACE_LOCAL_SERVICE_NAME,
  TRACE_ROOT_TOKEN,
  TraceModuleOptions,
  TraceParticipationStrategy
} from '@angular-tracing/core';

import { MultiplexingRecorder } from './multiplexing-recorder';
import { LocalTracer } from './local-tracer';
import { ZipkinHttpInterceptor } from './zipkin-http-interceptor';
import { ZipkinTraceRoot } from './zipkin-trace-root';
import { ZipkinTraceProviderOptions } from './types';
import { ZipkinTraceDirective } from './zipkin-trace.directive';
import { NavigationStart, Router } from '@angular/router';

export const TRACE_DIRECTIVES = [ZipkinTraceDirective];

/**
 * Module for distributed tracing with Angular. The module will setup the connection to the tracing provider
 * and optionally configure tracing of Angular's HttpClient. You can also use the {@link LocalTracer} or
 * {@link ZipkinTraceDirective} to configure tracing at the component level.
 *
 * Applications settings up tracing need to configure this module using the forRoot() method at the root of their
 * application. If you are using the directives, then you also need to import the module directly into any of your
 * submodules (not using forRoot).
 */
@NgModule({
  declarations: TRACE_DIRECTIVES,
  exports: TRACE_DIRECTIVES
})
export class ZipkinModule {
  /**
   * Subscribes to the router and clears the root span when a new router event occurs.
   *
   * @param router
   * @param traceRoot
   */
  constructor(private router: Router, private traceRoot: ZipkinTraceRoot) {
    router.events.subscribe(e => {
      if (e instanceof NavigationStart) {
        traceRoot.clear();
      }
    });
  }

  /**
   * Configures the module for use at the root level of the application
   *
   * @param options the module options
   */
  static forRoot(options: TraceModuleOptions<ZipkinTraceProviderOptions>) {
    const traceProvider = options.traceProvider;

    let recorder: Recorder;
    if (traceProvider.recorder) {
      recorder = traceProvider.recorder;
    } else {
      const zipkinBaseUrl = traceProvider.zipkinBaseUrl || 'http://localhost:9411';
      recorder = new BatchRecorder({
        logger: new HttpLogger({
          endpoint: `${zipkinBaseUrl}/api/v2/spans`,
          jsonEncoder: jsonEncoder.JSON_V2
        })
      });
    }

    if (traceProvider.logToConsole && !(recorder instanceof ConsoleRecorder)) {
      recorder = new MultiplexingRecorder([new ConsoleRecorder(), recorder]);
    }

    const localServiceName = options.localServiceName ? options.localServiceName : 'browser';
    const trace = new ZipkinTraceRoot(localServiceName, recorder, new Sampler(alwaysSample));

    const optional: Provider[] = [];

    const http = traceProvider.http;
    if (http) {
      optional.push({
        multi: true,
        provide: HTTP_INTERCEPTORS,
        useValue: new ZipkinHttpInterceptor(
          http.remoteServiceMapping || new RemoteHttpServiceMapping(),
          trace,
          localServiceName,
          http.participationStrategy || TraceParticipationStrategy.ALWAYS
        )
      });
    }

    return {
      ngModule: ZipkinModule,
      declarations: TRACE_DIRECTIVES,
      exports: TRACE_DIRECTIVES,
      providers: [
        {
          provide: TRACE_LOCAL_SERVICE_NAME,
          useValue: localServiceName
        },
        {
          provide: TRACE_ROOT_TOKEN,
          useValue: trace
        },
        {
          provide: ZipkinTraceRoot,
          useValue: trace
        },
        ...optional
      ]
    };
  }
}
