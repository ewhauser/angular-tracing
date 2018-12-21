import { Recorder } from 'zipkin';
import * as zipkin from 'zipkin';

export class TrackingRecorder implements Recorder {
  public records: zipkin.Record[] = [];

  record(rec: zipkin.Record): void {
    this.records.push(rec);
  }

  assertSize(size: Number) {
    expect(size).toEqual(this.records.length, 'Mismatched span count');
  }
}
