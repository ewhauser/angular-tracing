import { Inject, Injectable } from '@angular/core';

import * as zipkin from 'zipkin';
import { ExplicitContext, Recorder, sampler, Tracer } from 'zipkin';

import { LocalTracer } from './local-tracer';
import { TraceRoot } from './types';
import { TRACE_LOCAL_SERVICE_NAME, ZIPKIN_DEFAULT_TAGS, ZIPKIN_RECORDER, ZIPKIN_SAMPLER } from './injection-tokens';
import { ZipkinTraceTags } from './zipkin-types';
import { Router } from '@angular/router';

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
  private currentTracer: Tracer | undefined;
  private componentTracer: LocalTracer | undefined;

  constructor(
    @Inject(TRACE_LOCAL_SERVICE_NAME) public localServiceName: string,
    private router: Router,
    @Inject(ZIPKIN_RECORDER) private recorder: Recorder,
    @Inject(ZIPKIN_SAMPLER) private sample: sampler.Sampler,
    @Inject(ZIPKIN_DEFAULT_TAGS) private defaultTags?: ZipkinTraceTags
  ) {
    this.traceConfig = {
      recorder: this.recorder,
      localServiceName: this.localServiceName,
      sampler: this.sample
      // Enable this once on the latest version of zipkin-js: https://github.com/ewhauser/angular-tracing/issues/5
      // defaultTags: this.defaultTags,
    };
  }

  get(): Tracer | undefined {
    return this.currentTracer;
  }

  create(): Tracer {
    const ctxImpl = new ExplicitContext();
    this.currentTracer = new Tracer({
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
    return this.currentTracer;
  }

  getOrCreate(): Tracer {
    if (!this.currentTracer) {
      return this.create();
    }
    return this.currentTracer;
  }

  clear(): void {
    if (this.componentTracer) {
      this.componentTracer.endSpan();
    }
    this.currentTracer = undefined;
  }

  localTracer(): LocalTracer {
    return new LocalTracer(this.localServiceName, this.getOrCreate());
  }
}
