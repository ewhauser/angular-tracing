import { HttpTraceableOptions } from './types';

import { Recorder } from 'zipkin';
import * as zipkin from 'zipkin';
import Sampler = zipkin.sampler.Sampler;

/**
 * Tags that can be added to an individual trace
 */
export interface ZipkinTraceTags {
  [name: string]: boolean | string | number;
}

export interface ZipkinTraceProviderOptions {
  /**
   * The base URL of the Zipkin server to send spans
   */
  zipkinBaseUrl?: string;
  /**
   * The recorder to use
   */
  recorder?: Recorder;
  /**
   * Indicates whether to enable HTTP tracing
   */
  http?: HttpTraceableOptions;
  /**
   * Will log spans to cosnole regardless of what recorder is used
   */
  logToConsole?: boolean;
  /**
   * The sampler to use. By default, AlwaysSample is used.
   */
  sampler?: Sampler;
}
