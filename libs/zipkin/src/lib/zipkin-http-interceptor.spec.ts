import { Provider } from '@angular/core';
import { inject, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HTTP_INTERCEPTORS, HttpClient, HttpClientModule } from '@angular/common/http';

import { ZipkinTraceRoot } from './zipkin-trace-root';
import { ZipkinHttpInterceptor } from './zipkin-http-interceptor';
import {
  TRACE_HTTP_PARTICIPATION_STRATEGY,
  TRACE_HTTP_REMOTE_MAPPINGS,
  TRACE_LOCAL_SERVICE_NAME,
  TRACE_MODULE_CONFIGURATION,
  TRACE_ROOT_TOKEN,
  ZIPKIN_RECORDER,
  ZIPKIN_SAMPLER
} from './injection-tokens';
import { TraceParticipationStrategy } from './types';
import { TrackingRecorder } from './test-types';
import { RouterTestingModule } from '@angular/router/testing';
import * as zipkin from 'zipkin';
import alwaysSample = zipkin.sampler.alwaysSample;
import Sampler = zipkin.sampler.Sampler;
import { HttpHeaders } from 'zipkin';

const NO_MATCH_SERVICE_HOST = 'no.match.service';
const NO_MATCH_SERVICE_URL = `http://${NO_MATCH_SERVICE_HOST}/`;
const MATCH_SERVICE_HOST = 'match.service';
const MATCH_SERVICE_URL = `http://${MATCH_SERVICE_HOST}/`;
const REGEX_MATCH_SERVICE_HOST = 'regex.match.service';
const REGEX_MATCH_SERVICE_URL = `http://${REGEX_MATCH_SERVICE_HOST}/`;

const EXPECTED_B3_HEADERS = [HttpHeaders.TraceId, HttpHeaders.SpanId, HttpHeaders.ParentSpanId, HttpHeaders.Sampled];

function assertRequest(
  httpClient: HttpClient,
  url,
  httpMock: HttpTestingController,
  recorder: TrackingRecorder,
  size: number,
  clientTraced: boolean = true
) {
  httpClient.post(url, {}).subscribe();
  const request = httpMock.expectOne(url);
  if (size > 0 && clientTraced) {
    for (const header of EXPECTED_B3_HEADERS) {
      expect(request.request.headers.has(header)).toBeTruthy(
        `Expected ${JSON.stringify(request.request.headers)} to contain ${header}`
      );
    }
  }
  recorder.assertSize(size);
}

describe(`ZipkinHttpInterceptor`, () => {
  let recorder: TrackingRecorder;
  const mappings = {};
  mappings['match_service'] = MATCH_SERVICE_HOST;
  mappings['regex_match_service'] = REGEX_MATCH_SERVICE_HOST;

  const reset = () => {
    recorder = new TrackingRecorder();
    ZipkinTraceRoot.clear();
  };

  const providers: Provider[] = [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: ZipkinHttpInterceptor,
      multi: true
    },
    {
      provide: TRACE_LOCAL_SERVICE_NAME,
      useValue: 'browser'
    },
    {
      provide: TRACE_HTTP_REMOTE_MAPPINGS,
      useValue: mappings
    },
    {
      provide: ZIPKIN_RECORDER,
      useFactory: () => recorder
    },
    {
      provide: ZIPKIN_SAMPLER,
      useValue: new Sampler(alwaysSample)
    },
    {
      provide: TRACE_MODULE_CONFIGURATION,
      useValue: {}
    }
  ];

  const config = {
    imports: [HttpClientTestingModule, HttpClientModule, RouterTestingModule],
    providers
  };

  describe('when participation strategy is always', () => {
    beforeEach(() => {
      reset();
      const c = Object.assign({}, config);
      c.providers.push(
        {
          provide: TRACE_HTTP_PARTICIPATION_STRATEGY,
          useValue: TraceParticipationStrategy.ALWAYS
        },
        {
          provide: TRACE_ROOT_TOKEN,
          useClass: ZipkinTraceRoot
        }
      );
      TestBed.configureTestingModule(c);
    });

    it('does not create spans for unmatched domains but creates root', inject(
      [HttpTestingController, HttpClient, ZipkinTraceRoot],
      (httpMock: HttpTestingController, httpClient: HttpClient, traceRoot: ZipkinTraceRoot) => {
        assertRequest(httpClient, NO_MATCH_SERVICE_URL, httpMock, recorder, 3, false);
        expect(traceRoot.get()).toBeTruthy();
      }
    ));

    it('creates a span when there is a host match with a string', inject(
      [HttpTestingController, HttpClient, ZipkinTraceRoot],
      (httpMock: HttpTestingController, httpClient: HttpClient, traceRoot: ZipkinTraceRoot) => {
        assertRequest(httpClient, MATCH_SERVICE_URL, httpMock, recorder, 8);
        expect(traceRoot.get()).toBeTruthy();
      }
    ));

    it('creates a span when there is a host match with a regex', inject(
      [HttpTestingController, HttpClient, ZipkinTraceRoot],
      (httpMock: HttpTestingController, httpClient: HttpClient, traceRoot: ZipkinTraceRoot) => {
        assertRequest(httpClient, REGEX_MATCH_SERVICE_URL, httpMock, recorder, 8);
        expect(traceRoot.get()).toBeTruthy();
      }
    ));
  });

  describe('when participation strategy is child only', () => {
    beforeEach(() => {
      reset();
      const c = Object.assign({}, config);
      c.providers.push(
        {
          provide: TRACE_HTTP_PARTICIPATION_STRATEGY,
          useValue: TraceParticipationStrategy.CHILD_ONLY
        },
        {
          provide: TRACE_ROOT_TOKEN,
          useClass: ZipkinTraceRoot
        }
      );
      TestBed.configureTestingModule(c);
    });

    it('does not create root span for child only with no parent', inject(
      [HttpTestingController, HttpClient, ZipkinTraceRoot],
      (httpMock: HttpTestingController, httpClient: HttpClient, traceRoot: ZipkinTraceRoot) => {
        assertRequest(httpClient, REGEX_MATCH_SERVICE_URL, httpMock, recorder, 0);
        expect(traceRoot.get()).toBeFalsy();
      }
    ));

    it('creates span for child when parent exists', inject(
      [HttpTestingController, HttpClient, ZipkinTraceRoot],
      (httpMock: HttpTestingController, httpClient: HttpClient, traceRoot: ZipkinTraceRoot) => {
        traceRoot.getOrCreate();
        assertRequest(httpClient, REGEX_MATCH_SERVICE_URL, httpMock, recorder, 8);
        expect(traceRoot.get()).toBeTruthy();
      }
    ));
  });
});
