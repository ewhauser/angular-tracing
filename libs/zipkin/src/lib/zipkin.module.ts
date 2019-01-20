import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { ModuleWithProviders, NgModule } from '@angular/core';
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
  TRACE_MODULE_CONFIGURATION,
  TRACE_ROOT_TOKEN,
  ZIPKIN_RECORDER,
  ZIPKIN_SAMPLER
} from './injection-tokens';

export const TRACE_DIRECTIVES = [ZipkinTraceDirective];

const TRACE_PROVIDERS = [
  {
    provide: TRACE_ROOT_TOKEN,
    useClass: ZipkinTraceRoot,
    deps: [TRACE_LOCAL_SERVICE_NAME, Router, ZIPKIN_RECORDER, ZIPKIN_SAMPLER]
  },
  {
    multi: true,
    provide: HTTP_INTERCEPTORS,
    useClass: ZipkinHttpInterceptor,
    deps: [TRACE_HTTP_REMOTE_MAPPINGS, TRACE_ROOT_TOKEN, TRACE_LOCAL_SERVICE_NAME, TRACE_HTTP_PARTICIPATION_STRATEGY]
  },
  {
    provide: TRACE_LOCAL_SERVICE_NAME,
    useFactory: getLocalServiceName,
    deps: [TRACE_MODULE_CONFIGURATION]
  },
  {
    provide: ZIPKIN_RECORDER,
    useFactory: getRecorder,
    deps: [TRACE_MODULE_CONFIGURATION]
  },
  {
    provide: ZIPKIN_SAMPLER,
    useFactory: getSampler,
    deps: [TRACE_MODULE_CONFIGURATION]
  },
  {
    provide: TRACE_HTTP_REMOTE_MAPPINGS,
    useFactory: getRemoteServiceMappings,
    deps: [TRACE_MODULE_CONFIGURATION]
  },
  {
    provide: TRACE_HTTP_PARTICIPATION_STRATEGY,
    useFactory: getTraceParticipationStrategy,
    deps: [TRACE_MODULE_CONFIGURATION]
  }
];

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
   * Configures the module for use at the root level of the application. If you use this method, then it is
   * expected that you are injecting the configuration via DI.
   */
  static forRoot(): ModuleWithProviders {
    return {
      ngModule: ZipkinModule,
      providers: TRACE_PROVIDERS
    };
  }

  /**
   * Configures the module for use at the root level of the application with an explicit configuration.
   *
   * @param options the module options
   */
  static forRootWithConfig(options: TraceModuleOptions<ZipkinTraceProviderOptions>): ModuleWithProviders {
    return {
      ngModule: ZipkinModule,
      providers: [
        {
          provide: TRACE_MODULE_CONFIGURATION,
          useValue: options
        },
        ...TRACE_PROVIDERS
      ]
    };
  }
}

export function getLocalServiceName(options: TraceModuleOptions<ZipkinTraceProviderOptions>) {
  return options.localServiceName ? options.localServiceName : 'browser';
}

export function getRecorder(options: TraceModuleOptions<ZipkinTraceProviderOptions>) {
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
  return recorder;
}

export function getSampler(options: TraceModuleOptions<ZipkinTraceProviderOptions>) {
  const traceProvider = options.traceProvider || {};
  return traceProvider.sampler ? traceProvider.sampler : new Sampler(alwaysSample);
}

export function getRemoteServiceMappings(options: TraceModuleOptions<ZipkinTraceProviderOptions>) {
  const provider = options.traceProvider || {};
  let mappings = {};
  if (provider.http) {
    mappings = provider.http.remoteServiceMapping || new RemoteHttpServiceMapping();
  }
  return mappings;
}

export function getTraceParticipationStrategy(options: TraceModuleOptions<ZipkinTraceProviderOptions>) {
  const provider = options.traceProvider || {};
  let traceParticipationStrategy = TraceParticipationStrategy.ALWAYS;
  if (provider.http && provider.http.participationStrategy) {
    traceParticipationStrategy = provider.http.participationStrategy;
  }
  return traceParticipationStrategy;
}
