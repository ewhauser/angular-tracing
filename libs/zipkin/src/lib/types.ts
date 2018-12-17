import { HttpClient } from '@angular/common/http';

export type RegExpOrString = string | RegExp;

/**
 * Provides a mapping to a remote HTTP service. An example mapping would be:
 *
 * const config: MapStringToFunction = {};
 * config['google.com'] = \/.*google.com.*\/
 *
 * The value can either be a string or a regular expression.
 */
export class RemoteHttpServiceMapping {
  [remoteServiceName: string]: RegExpOrString;
}

/**
 * Indicates how tooling (such as an HTTP interceptor) should determine
 * whether to participate in a trace.
 */
export enum TraceParticipationStrategy {
  /**
   * Always participate regardless of whether an existing trace exists or not
   */
  ALWAYS,
  /**
   * Only participate if an existing trace is already started.
   */
  CHILD_ONLY
}

/**
 * Options for tracing the {@link HttpClient}.
 */
export interface HttpTraceableOptions {
  /**
   * The mappings to use when tracing HTTP
   */
  remoteServiceMapping?: RemoteHttpServiceMapping;
  /**
   * The strategy to use when determining if the interceptor should participate in the trace. By default,
   * the HTTP interceptor will generate a trace whether or not a root span has already been started.
   */
  participationStrategy?: TraceParticipationStrategy;
}

/**
 * Options for the trace module.
 */
export interface TraceModuleOptions<T> {
  /**
   * The name of the local service. Defaults to 'browser' if not specified'
   */
  localServiceName?: string;
  /**
   * The configuration for the individual trace provider
   */
  traceProvider: T;
}

/* tslint:disable */
/**
 * Marker interface for injecting the TraceContext into directives since you won't know the generic type
 * argument at compile time.
 */
export interface _TraceRoot {}
/* tslint:enable */

/**
 * A locator/factory for getting the root span.
 *
 * @typeparam S The type of the root span. For Zipkin, this is Tracer. For other libraries, this may
 * be a Span.
 */
export interface TraceRoot<S extends any = any> extends _TraceRoot {
  /**
   * Creates a root span.
   */
  create(): S;

  /**
   * Gets the current root span or undefined if it does not exist.
   */
  get(): S | undefined;

  /**
   * Gets or creates a root span.
   */
  getOrCreate(): S;

  /**
   * Clears the current root span.
   */
  clear(): void;
}
