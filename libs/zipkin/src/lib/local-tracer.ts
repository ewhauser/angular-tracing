import { Inject, Injectable } from '@angular/core';
import * as zipkin from 'zipkin';
import { TraceId } from 'zipkin';
import LocalOperationStart = zipkin.Annotation.LocalOperationStart;
import LocalOperationStop = zipkin.Annotation.LocalOperationStop;

import { TRACE_LOCAL_SERVICE_NAME } from './injection-tokens';

@Injectable({
  providedIn: 'root'
})
export class LocalTracer {
  private static readonly localStack: TraceId[] = [];

  private traceId: TraceId | undefined;

  constructor(@Inject(TRACE_LOCAL_SERVICE_NAME) private localServiceName: string, private tracer: zipkin.Tracer) {}

  private static peek() {
    return LocalTracer.localStack.length > 0 ? LocalTracer.localStack[LocalTracer.localStack.length - 1] : undefined;
  }

  startSpan(name: string) {
    const currentTraceId = LocalTracer.peek();
    this.traceId = currentTraceId || this.tracer.createChildId();
    this.tracer.setId(this.traceId);
    this.tracer.recordServiceName(this.localServiceName);
    this.tracer.recordAnnotation(new LocalOperationStart(name));
    LocalTracer.localStack.push(this.traceId);
    return this.traceId;
  }

  recordMessage(message: string) {
    if (this.traceId) {
      this.tracer.setId(this.traceId);
      this.tracer.recordMessage(message);
    }
  }

  putTag(key: string, value: boolean | string | number) {
    if (this.traceId) {
      this.tracer.setId(this.traceId);
      this.tracer.recordBinary(key, value);
    }
  }

  endSpan(err?: any) {
    if (this.traceId) {
      this.tracer.setId(this.traceId);
      if (err) {
        this.tracer.recordBinary('error', err.message ? err.message : err.toString());
      }
      this.tracer.recordAnnotation(new LocalOperationStop());
      LocalTracer.localStack.pop();
    }
  }
}
