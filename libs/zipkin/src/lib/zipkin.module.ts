import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { ModuleWithProviders, NgModule, Provider } from '@angular/core';
import { NavigationStart, Router } from '@angular/router';

import * as zipkin from 'zipkin';
import { BatchRecorder, ConsoleRecorder, jsonEncoder, Recorder } from 'zipkin';
import { HttpLogger } from 'zipkin-transport-http';
import alwaysSample = zipkin.sampler.alwaysSample;
import Sampler = zipkin.sampler.Sampler;

import { MultiplexingRecorder } from './multiplexing-recorder';
import { LocalTracer } from './local-tracer';
import { ZipkinHttpInterceptor } from './zipkin-http-interceptor';
import { ZipkinTraceRoot } from './zipkin-trace-root';
import { ZipkinTraceProviderOptions } from './zipkin-types';
import { ZipkinTraceDirective } from './zipkin-trace.directive';
import { RemoteHttpServiceMapping, TraceModuleOptions, TraceParticipationStrategy } from './types';
import {
  TRACE_HTTP_PARTICIPATION_STRATEGY,
  TRACE_LOCAL_SERVICE_NAME,
  TRACE_HTTP_REMOTE_MAPPINGS,
  TRACE_ROOT_TOKEN,
  ZIPKIN_DEFAULT_TAGS,
  ZIPKIN_RECORDER,
  ZIPKIN_SAMPLER
} from './injection-tokens';

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
    // https://angular.io/guide/aot-compiler#no-arrow-functions
    router.events.subscribe(function(e) {
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
  static forRoot(options: TraceModuleOptions<ZipkinTraceProviderOptions>): ModuleWithProviders {
    const traceProvider = options.traceProvider || {};

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
    const sampler = traceProvider.sampler ? traceProvider.sampler : new Sampler(alwaysSample);
    const defaultTags = traceProvider.defaultTags || {};

    const optional: Provider[] = [];

    const http = traceProvider.http;
    if (http) {
      const traceParticipationStrategy = http.participationStrategy || TraceParticipationStrategy.ALWAYS;
      optional.push(
        {
          multi: true,
          provide: HTTP_INTERCEPTORS,
          useClass: ZipkinHttpInterceptor
          /*useValue: new ZipkinHttpInterceptor(
            http.remoteServiceMapping || new RemoteHttpServiceMapping(),
            trace,
            localServiceName,
            traceParticipationStrategy
          )*/
        },
        {
          provide: TRACE_HTTP_REMOTE_MAPPINGS,
          useValue: http.remoteServiceMapping || new RemoteHttpServiceMapping()
        },
        {
          provide: TRACE_HTTP_PARTICIPATION_STRATEGY,
          useValue: traceParticipationStrategy
        }
      );
    }

    return {
      ngModule: ZipkinModule,
      providers: [
        {
          provide: TRACE_LOCAL_SERVICE_NAME,
          useValue: localServiceName
        },
        {
          provide: TRACE_ROOT_TOKEN,
          useClass: ZipkinTraceRoot
        },
        {
          provide: ZIPKIN_RECORDER,
          useValue: recorder
        },
        {
          provide: ZIPKIN_SAMPLER,
          useValue: sampler
        },
        {
          provide: ZIPKIN_DEFAULT_TAGS,
          useValue: defaultTags
        },
        {
          provide: ZipkinTraceRoot,
          useClass: ZipkinTraceRoot
        },
        ...optional
      ]
    };
  }
}
