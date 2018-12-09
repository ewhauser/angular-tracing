import { Recorder } from 'zipkin';
import * as zipkin from 'zipkin';

/**
 * Allows the use of multiple {@link Recorder}'s. Useful for sending data to the console
 * as well as outputting to HTTP.
 */
export class MultiplexingRecorder implements Recorder {
  constructor(private recorders: Recorder[]) {}

  record(rec: zipkin.Record): void {
    this.recorders.forEach(r => r.record(rec));
  }
}
