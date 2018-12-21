import { ExplicitContext, IAnnotation, TraceId, Tracer } from 'zipkin';
import * as zipkin from 'zipkin';
import alwaysSample = zipkin.sampler.alwaysSample;
import LocalOperationStart = zipkin.Annotation.LocalOperationStart;
import LocalOperationStop = zipkin.Annotation.LocalOperationStop;
import Sampler = zipkin.sampler.Sampler;

import { LocalTracer } from './local-tracer';
import { TrackingRecorder } from './test-types';

function assertSpan(
  record: zipkin.Record,
  root: zipkin.Tracer,
  parentId: TraceId,
  spanId: TraceId,
  annotation?: IAnnotation
) {
  const recordedId = record.traceId;
  expect(record.traceId.spanId).toEqual(root.id.spanId);
  expect(recordedId.parentId).toEqual(parentId.spanId);
  expect(recordedId.spanId).toEqual(spanId.spanId);
  if (annotation) {
    expect(record.annotation).toEqual(annotation);
  }
}

describe(`LocalTracer`, () => {
  let root: Tracer;
  let tracer: LocalTracer;
  let recorder: TrackingRecorder;

  beforeEach(() => {
    recorder = new TrackingRecorder();
    const ctxImpl = new ExplicitContext();
    root = new Tracer({
      ctxImpl,
      recorder,
      localServiceName: 'default',
      sampler: new Sampler(alwaysSample)
    });

    tracer = new LocalTracer('default', root);
  });

  it('records a span', () => {
    tracer.startSpan('test');
    tracer.endSpan();
    recorder.assertSize(3);
  });

  it('records nested spans correctly', () => {
    const first = tracer.startSpan('test');
    const second = tracer.startSpan('test2');
    tracer.endSpan();
    tracer.endSpan();

    assertSpan(recorder.records[1], root, first, first, new LocalOperationStart('test'));
    assertSpan(recorder.records[3], root, first, second, new LocalOperationStart('test2'));
    assertSpan(recorder.records[4], root, first, second, new LocalOperationStop());
    assertSpan(recorder.records[5], root, first, first, new LocalOperationStop());
  });
});
