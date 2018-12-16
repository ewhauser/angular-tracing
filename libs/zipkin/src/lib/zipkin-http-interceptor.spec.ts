import { Provider } from '@angular/core';
import { inject, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HTTP_INTERCEPTORS, HttpClient, HttpClientModule } from '@angular/common/http';

import { Recorder } from 'zipkin';
import * as zipkin from 'zipkin';
import Sampler = zipkin.sampler.Sampler;
import alwaysSample = zipkin.sampler.alwaysSample;
import { ZipkinTraceRoot } from './zipkin-trace-root';
import { ZipkinHttpInterceptor } from './zipkin-http-interceptor';
import { TRACE_HTTP_PARTICIPATION_STRATEGY, TRACE_LOCAL_SERVICE_NAME } from './injection-tokens';
import { RemoteHttpServiceMapping, TraceParticipationStrategy } from './types';

const NO_MATCH_SERVICE_HOST = 'no.match.service';
const NO_MATCH_SERVICE_URL = `http://${NO_MATCH_SERVICE_HOST}/`;
const MATCH_SERVICE_HOST = 'match.service';
const MATCH_SERVICE_URL = `http://${MATCH_SERVICE_HOST}/`;
const REGEX_MATCH_SERVICE_HOST = 'regex.match.service';
const REGEX_MATCH_SERVICE_URL = `http://${REGEX_MATCH_SERVICE_HOST}/`;

class TrackingRecorder implements Recorder {
  public records: zipkin.Record[] = [];

  record(rec: zipkin.Record): void {
    this.records.push(rec);
  }

  assertSize(size: Number) {
    expect(size).toEqual(this.records.length, 'Mismatched span count');
  }
}

function assertRequest(
  httpClient: HttpClient,
  url,
  httpMock: HttpTestingController,
  recorder: TrackingRecorder,
  size: number
) {
  httpClient.post(url, {}).subscribe();
  httpMock.expectOne(url);
  recorder.assertSize(size);
}

describe(`ZipkinHttpInterceptor`, () => {
  let traceRoot: ZipkinTraceRoot;
  let recorder: TrackingRecorder;
  const mappings = {};
  mappings['match_service'] = MATCH_SERVICE_HOST;
  mappings['regex_match_service'] = REGEX_MATCH_SERVICE_HOST;

  const reset = () => {
    recorder = new TrackingRecorder();
    traceRoot = new ZipkinTraceRoot('test', recorder, new Sampler(alwaysSample));
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
      provide: RemoteHttpServiceMapping,
      useValue: mappings
    }
  ];

  const config = {
    imports: [HttpClientTestingModule, HttpClientModule],
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
          provide: ZipkinTraceRoot,
          useValue: traceRoot
        }
      );
      TestBed.configureTestingModule(c);
    });

    it('does not create spans for unmatched domains but creates root', inject(
      [HttpTestingController, HttpClient],
      (httpMock: HttpTestingController, httpClient: HttpClient) => {
        assertRequest(httpClient, NO_MATCH_SERVICE_URL, httpMock, recorder, 0);
        expect(traceRoot.get()).toBeTruthy();
      }
    ));

    it('creates a span when there is a host match with a string', inject(
      [HttpTestingController, HttpClient],
      (httpMock: HttpTestingController, httpClient: HttpClient) => {
        assertRequest(httpClient, MATCH_SERVICE_URL, httpMock, recorder, 5);
        expect(traceRoot.get()).toBeTruthy();
      }
    ));

    it('creates a span when there is a host match with a regex', inject(
      [HttpTestingController, HttpClient],
      (httpMock: HttpTestingController, httpClient: HttpClient) => {
        assertRequest(httpClient, REGEX_MATCH_SERVICE_URL, httpMock, recorder, 5);
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
          provide: ZipkinTraceRoot,
          useValue: traceRoot
        }
      );
      TestBed.configureTestingModule(c);
    });

    it('does not create root span for child only with no parent', inject(
      [HttpTestingController, HttpClient],
      (httpMock: HttpTestingController, httpClient: HttpClient) => {
        assertRequest(httpClient, REGEX_MATCH_SERVICE_URL, httpMock, recorder, 0);
        expect(traceRoot.get()).toBeFalsy();
      }
    ));

    it('creates span for child when parent exists', inject(
      [HttpTestingController, HttpClient],
      (httpMock: HttpTestingController, httpClient: HttpClient) => {
        traceRoot.getOrCreate();
        assertRequest(httpClient, REGEX_MATCH_SERVICE_URL, httpMock, recorder, 5);
        expect(traceRoot.get()).toBeTruthy();
      }
    ));
  });
});
