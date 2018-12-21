import { Inject, Injectable } from '@angular/core';

import * as zipkin from 'zipkin';
import { ExplicitContext, Recorder, sampler, Tracer } from 'zipkin';

import { LocalTracer } from './local-tracer';
import { TraceRoot } from './types';
import { TRACE_LOCAL_SERVICE_NAME, ZIPKIN_DEFAULT_TAGS, ZIPKIN_RECORDER, ZIPKIN_SAMPLER } from './injection-tokens';
import { ZipkinTraceTags } from './zipkin-types';
import { ActivatedRoute } from '@angular/router';

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

  constructor(
    @Inject(TRACE_LOCAL_SERVICE_NAME) public localServiceName: string,
    private activatedRoute: ActivatedRoute,
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
    return new Tracer({
      ctxImpl,
      ...this.traceConfig
    });
  }

  getOrCreate(): Tracer {
    if (!this.currentTracer) {
      this.currentTracer = this.create();
    }
    return this.currentTracer;
  }

  clear(): void {
    this.currentTracer = undefined;
  }

  localTracer(): LocalTracer {
    return new LocalTracer(this.localServiceName, this.getOrCreate());
  }
}
