import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { TRACE_MODULE_CONFIGURATION, ZipkinModule } from '@angular-tracing/zipkin';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { CoreModule } from './core';
import { AppStoreModule } from './store/store.module';
import { AboutComponent } from './about.component';

export function getZipkinConfig() {
  return {
    traceProvider: {
      http: {
        remoteServiceMapping: {
          all: new RegExp('.*')
        }
      },
      logToConsole: true
    }
  };
}

@NgModule({
  declarations: [AppComponent, AboutComponent],
  imports: [BrowserModule, HttpClientModule, CoreModule, AppRoutingModule, AppStoreModule, ZipkinModule.forRoot()],
  providers: [{ provide: TRACE_MODULE_CONFIGURATION, useFactory: getZipkinConfig }],
  bootstrap: [AppComponent]
})
export class AppModule {}
