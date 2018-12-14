import { AfterViewInit, Directive, Inject, Injectable, Input, OnInit, ViewContainerRef } from '@angular/core';
import { TRACE_DIRECTIVE_SELECTOR } from '@angular-tracing/core';
import { TRACE_ROOT_TOKEN } from '@angular-tracing/core';

import { ZipkinTraceTags } from './types';
import { LocalTracer } from './local-tracer';
import { ZipkinTraceRoot } from './zipkin-trace-root';

/**
 * A directive that allows you to add tracing to elements within templates. You can start tracing by adding the
 * selector:
 *
 * <app-component trace></app-component>
 *
 * By default the name of the component will be used as the span name. You can override this by providing your own
 * name:
 *
 * <app-component trace [traceName]="my-span-name"></app-component>
 *
 * You can also provide your own tags for the span:
 *
 * <app-component trace [traceName]="my-span-name" [traceTags]="{user: selected.id}"></app-component>
 */
@Directive({
  selector: TRACE_DIRECTIVE_SELECTOR
})
@Injectable({
  providedIn: 'root'
})
export class ZipkinTraceDirective implements OnInit, AfterViewInit {
  @Input('traceName') name = 'undefined';
  @Input('traceTags') tags: ZipkinTraceTags = {};
  @Input('traceMessage') message: string | undefined;

  private tracer: LocalTracer;

  constructor(private vcRef: ViewContainerRef, @Inject(TRACE_ROOT_TOKEN) private traceContext: ZipkinTraceRoot) {
    this.tracer = traceContext.localTracer();
  }

  ngOnInit(): void {
    let spanName = this.name;
    if (!spanName) {
      spanName = this.vcRef['_view'].component['name'];
    }
    this.tracer.startSpan(spanName);
    Object.keys(this.tags).forEach(tag => {
      this.tracer.putTag(tag, this.tags[tag]);
    });
    if (this.message) {
      this.tracer.recordMessage(this.message);
    }
  }

  ngAfterViewInit(): void {
    this.tracer.endSpan();
  }
}
