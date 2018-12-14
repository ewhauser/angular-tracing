import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { ZipkinModule } from '@angular-tracing/zipkin';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { CoreModule } from './core';
import { AppStoreModule } from './store/store.module';
import { AboutComponent } from './about.component';

export function getMappings() {
  const remoteServiceMappings = {};
  remoteServiceMappings['all'] = /.*/;
  return remoteServiceMappings;
}

@NgModule({
  declarations: [AppComponent, AboutComponent],
  imports: [
    BrowserModule,
    HttpClientModule,
    CoreModule,
    AppRoutingModule,
    AppStoreModule,
    ZipkinModule.forRoot({
      traceProvider: {
        http: {
          remoteServiceMapping: getMappings()
        },
        logToConsole: true
      }
    })
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {}
