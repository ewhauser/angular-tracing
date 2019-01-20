import { Inject, Injectable } from '@angular/core';

import * as zipkin from 'zipkin';
import { ExplicitContext, Recorder, sampler, Tracer } from 'zipkin';

import { LocalTracer } from './local-tracer';
import { TraceModuleOptions, TraceRoot } from './types';
import {
  TRACE_LOCAL_SERVICE_NAME,
  TRACE_MODULE_CONFIGURATION,
  ZIPKIN_RECORDER,
  ZIPKIN_SAMPLER
} from './injection-tokens';
import { ZipkinTraceProviderOptions } from './zipkin-types';
import { Router } from '@angular/router';
import alwaysSample = zipkin.sampler.alwaysSample;
import Sampler = zipkin.sampler.Sampler;

let currentTracer: Tracer | undefined;

/**
 * The trace root is a locator for finding the root span.
 */
@Injectable({
  providedIn: 'root'
})
export class ZipkinTraceRoot implements TraceRoot<Tracer> {
  private readonly traceConfig: {
    recorder: zipkin.Recorder;
    localServiceName: string;
    sampler: zipkin.sampler.Sampler;
    // defaultTags?: ZipkinTraceTags,
  };
  private componentTracer: LocalTracer | undefined;

  static clear() {
    currentTracer = undefined;
  }

  constructor(
    @Inject(TRACE_LOCAL_SERVICE_NAME) public localServiceName: string,
    private router: Router,
    @Inject(ZIPKIN_RECORDER) private recorder: Recorder,
    @Inject(ZIPKIN_SAMPLER) private sample: sampler.Sampler,
    @Inject(TRACE_MODULE_CONFIGURATION) private config: TraceModuleOptions<ZipkinTraceProviderOptions>
  ) {
    this.traceConfig = {
      recorder,
      localServiceName,
      sampler: this.sample
      // Enable this once on the latest version of zipkin-js: https://github.com/ewhauser/angular-tracing/issues/5
      // defaultTags: this.config.defaultTags || {},
    };
  }

  get(): Tracer | undefined {
    return currentTracer;
  }

  create(): Tracer {
    const ctxImpl = new ExplicitContext();
    currentTracer = new Tracer({
      ctxImpl,
      ...this.traceConfig
    });

    let route = this.router.routerState.root;
    while (route.firstChild) {
      route = route.firstChild;
    }
    if (route.snapshot) {
      const component = route.snapshot.component;
      const name = component && component.hasOwnProperty('name') ? component['name'] : 'component';
      this.componentTracer = this.localTracer();
      this.componentTracer.startSpan(name);
      this.componentTracer.putTag('/window/location/href', window.location.href);
    }
    return currentTracer;
  }

  getOrCreate(): Tracer {
    if (!currentTracer) {
      return this.create();
    }
    return currentTracer;
  }

  clear(): void {
    if (this.componentTracer) {
      this.componentTracer.endSpan();
    }
    ZipkinTraceRoot.clear();
  }

  localTracer(): LocalTracer {
    return new LocalTracer(this.localServiceName, this.getOrCreate());
  }
}
