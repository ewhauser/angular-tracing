import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { ModuleWithProviders, Provider } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';

import {
  TRACE_HTTP_PARTICIPATION_STRATEGY,
  TRACE_LOCAL_SERVICE_NAME,
  TRACE_MODULE_CONFIGURATION,
  TRACE_ROOT_TOKEN
} from './injection-tokens';
import { TraceParticipationStrategy } from './types';
import { ZipkinModule } from './zipkin.module';
import { ZipkinTraceRoot } from './zipkin-trace-root';

const MODULES = [RouterModule, RouterTestingModule];

function createModule(provider: Provider | ModuleWithProviders, providers: Provider[] = []) {
  TestBed.configureTestingModule({
    imports: [...MODULES, provider],
    providers
  }).compileComponents();
}

describe('ZipkinModule with no configuration', () => {
  beforeEach(() => {
    createModule(ZipkinModule);
  });

  it('should create', () => {
    expect(ZipkinModule).toBeDefined();
  });
});

describe('ZipkinModule for root', () => {
  describe('with empty config', () => {
    beforeEach(() => {
      createModule(ZipkinModule.forRootWithConfig({}));
    });

    it('defines the browser name', () => {
      expect(TestBed.get(TRACE_LOCAL_SERVICE_NAME)).toEqual('browser');
    });
    it('creates the trace root', () => {
      const traceRoot = TestBed.get(TRACE_ROOT_TOKEN) as ZipkinTraceRoot;
      expect(traceRoot).toBeTruthy();
    });
  });
  describe('with config as provider', () => {
    beforeEach(() => {
      createModule(ZipkinModule.forRoot(), [
        {
          provide: TRACE_MODULE_CONFIGURATION,
          useValue: {}
        }
      ]);
    });

    it('defines the browser name', () => {
      expect(TestBed.get(TRACE_LOCAL_SERVICE_NAME)).toEqual('browser');
    });
    it('creates the trace root', () => {
      const traceRoot = TestBed.get(TRACE_ROOT_TOKEN) as ZipkinTraceRoot;
      expect(traceRoot).toBeTruthy();
    });
  });
  describe('with empty HTTP config', () => {
    beforeEach(() => {
      createModule(
        ZipkinModule.forRootWithConfig({
          traceProvider: {
            http: {}
          }
        })
      );
    });
    it('injects the HTTP interceptor', () => {
      expect(() => TestBed.get(HTTP_INTERCEPTORS)).not.toThrow();
    });
    it('to set the trace participation to always', () => {
      expect(TestBed.get(TRACE_HTTP_PARTICIPATION_STRATEGY)).toEqual(TraceParticipationStrategy.ALWAYS);
    });
  });
  describe('can override HTTP config', () => {
    beforeEach(() => {
      createModule(
        ZipkinModule.forRootWithConfig({
          traceProvider: {
            http: {
              participationStrategy: TraceParticipationStrategy.CHILD_ONLY
            }
          }
        })
      );
    });
    it('to set the trace participation to child only', () => {
      expect(TestBed.get(TRACE_HTTP_PARTICIPATION_STRATEGY)).toEqual(TraceParticipationStrategy.CHILD_ONLY);
    });
  });
});
