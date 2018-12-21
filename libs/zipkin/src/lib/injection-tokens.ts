import { InjectionToken } from '@angular/core';

export const TRACE_ROOT_TOKEN = new InjectionToken<string>('TRACE_ROOT_TOKEN');

export const TRACE_LOCAL_SERVICE_NAME = new InjectionToken<string>('TRACE_LOCAL_SERVICE_NAME');

export const TRACE_HTTP_PARTICIPATION_STRATEGY = new InjectionToken<string>('TRACE_HTTP_PARTICIPATION_STRATEGY');

export const TRACE_HTTP_REMOTE_MAPPINGS = new InjectionToken<string>('TRACE_REMOTE_MAPPINGS');

export const ZIPKIN_DEFAULT_TAGS = new InjectionToken<string>('ZIPKIN_DEFAULT_TAGS');

export const ZIPKIN_SAMPLER = new InjectionToken<string>('ZIPKIN_SAMPLER');

export const ZIPKIN_RECORDER = new InjectionToken<string>('ZIPKIN_RECORDER');
