import { Inject, Injectable } from '@angular/core';

import * as zipkin from 'zipkin';
import { Annotation, TraceId } from 'zipkin';
import LocalOperationStart = zipkin.Annotation.LocalOperationStart;
import LocalOperationStop = zipkin.Annotation.LocalOperationStop;
import { TRACE_LOCAL_SERVICE_NAME } from './injection-tokens';

@Injectable({
  providedIn: 'root'
})
export class LocalTracer {
  private traceId: TraceId | undefined;

  constructor(@Inject(TRACE_LOCAL_SERVICE_NAME) private localServiceName: string, private tracer: zipkin.Tracer) {}

  startSpan(name: string) {
    this.traceId = this.tracer.createChildId();
    this.tracer.setId(this.traceId);
    this.tracer.recordServiceName(this.localServiceName);
    this.tracer.recordAnnotation(new LocalOperationStart(name));
  }

  recordMessage(message: string) {
    if (this.traceId) {
      this.tracer.setId(this.traceId);
      this.tracer.recordMessage(message);
    }
  }

  recordError(err: any) {
    if (this.traceId) {
      this.tracer.setId(this.traceId);
      this.tracer.recordBinary('error', err.message ? err.message : err.toString());
      this.tracer.recordAnnotation(new Annotation.LocalOperationStop());
    }
  }

  putTag(key: string, value: boolean | string | number) {
    if (this.traceId) {
      this.tracer.setId(this.traceId);
      this.tracer.recordBinary(key, value);
    }
  }

  endSpan() {
    if (this.traceId) {
      this.tracer.setId(this.traceId);
      this.tracer.recordAnnotation(new LocalOperationStop());
    }
  }
}
