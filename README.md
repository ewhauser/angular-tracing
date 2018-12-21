# angular-tracing

Distributed tracing for Angular applications.

_Note_: This library is currently a heavy work in progress so expect there to be breaking changes.

# Goals

- Enable distributed tracing for Angular applications
- Support for tracing in both components and views
- Tracing integration for Angular's HttpClient
- Tracing library independent (without providing leaky abstractions)

# Demo

- Download the repo
- Run `yarn quick` (requires Docker to be installed)
- Open http://localhost:4200 and click through some page
- Open the Zipkin UI at http://localhost:9411 and view the traces

![Browser traces in Zipkin](https://user-images.githubusercontent.com/131389/49890350-b67a8680-fdf8-11e8-97ac-9d2c815621ec.png)

You can view the source of the example Angular application being traced under `apps/heroes-villains`.

# Usage

## Configuration

Add the required modules:

```console
$ yarn add @angular-tracing/zipkin zipkin zipkin-transport-http
```

You'll need to use this [workaround](https://github.com/openzipkin/zipkin-js#typescript) for compiling with `zipkin-transport-http` (note that there are current issues with the Zipkin `0.15.0` release so please use `0.14.3`.

Then add the tracing module to your `app.module`:

```typescript
@NgModule({
  declarations: [...],
  imports: [
    ...
    ZipkinModule.forRoot({
      traceProvider: {
        http: {
          remoteServiceMapping: {
            all: /.*/
          }
        },
        logToConsole: true
      }
    })
  ],
  providers: [],
  bootstrap: [...]
})
export class AppModule {}
```

The `remoteServiceMapping` element maps outbound HTTP requests to a backend service. In the above example, we have white listed all outbound requests via a regular expression to map to the service name `all`. In your application, you will likely have one or more backend services that are being traced that your application will make requests to. A more realistic real world configuration:

```typescript
const function remoteServiceMappings() {
  const mappings = {};
  mappings['api_server'] = Environment.API_SERVER;
  mappings['github'] = 'api.github.com';
  mappings['mapbox'] = /.*mapbox.com.*/
}

{
  remoteServiceMapping: remoteServiceMappings()
}
```

The default configuration will setup tracing of the `HttpClient` and send to a remote Zipkin service operating at `https://localhost:9411`. For additional configuration options, please see the [core](https://github.com/ewhauser/angular-tracing) and [zipkin](https://github.com/ewhauser/angular-tracing) configuration definitions.

## Components

Typical tracing in a component might look soemthing like this:

```typescript
@Component({
  selector: 'app-heroes',
  templateUrl: './heroes.component.html'
})
export class HeroesComponent implements OnInit {
  heroes$: Observable<Hero[]>;
  private tracer: LocalTracer;

  constructor(private heroService: HeroService, private user: User, traceRoot: ZipkinTraceRoot) {
    this.heroes$ = heroService.entities$;
    this.localTracer = traceRoot.localTracer();
  }

  ngOnInit() {
    this.getHeroes();
    try {
      this.localTracer.startSpan('expensive_history_recording_call');
      this.localTracer.setTags({ user: user.id });
      this.user.recordHistory();
    finally {
      this.localTracer.endSpan();
    }
  }
}
```

Let's walk through the different pieces:

- The `ZipkinTraceRoot` is a locator for finding the root span. In `zipkin-js`, the root span is created by creating a `Tracer` instance. It will automatically detect that it is running inside a component and create a span for the `heroesComponent`
- The `LocalTracer` is an adapter for runnning Zipkin traces in a synchronous context. Zipkin's `Tracer` class provides a method for doing local traces via a callback pattern.
- The child span created for `expensive_history_recording_call` will exist as a child of the `heroesComponent` call and a tag of `user` with the user's ID.

## Directives

You can also enable tracing with your component by using directives. Any element can by traced, but let's assume that we are rendering a user:

```html
<app-user-component [id]="user.id"></app-user-component>
```

To add tracing to the component, you add the `trace` directive:

```html
<app-user-component trace [id]="user.id"></app-user-component>
```

This will start a span for the rendering of the component. You can add a specific name for the span:

```html
<app-user-component trace [traceName]="'userComponent'" [id]="user.id"></app-user-component>
```

And add tags:

```html
<app-user-component
  trace
  [traceName]="'userComponent'"
  [traceTags]="{ user: user.id }"
  [id]="user.id"
></app-user-component>
```

Or log a message:

```html
<app-user-component
  trace
  [traceName]="'userComponent'"
  [traceTags]="{ user: user.id }"
  [traceMessage]="'Rendering a user as part of the UserHistory component'"
  [id]="user.id"
></app-user-component>
```

# Tracing Libraries

There are a number of tracing libraries available including:

- Zipkin
- OpenCensus (no browser compatible library at the moment)
- OpenTracing

This library currently only has an implementation for sending traces to Zipkin, but the intent is not to be opinated on which tracing library you use. However, this library is opinionated in the fact that the underlying tracing system should be directly exposed to the user (i.e. we are not going to provide a leaky abstraction over all distributed tracing systems). You'll notice in the examples above the all of the code directly references Zipkin's `Tracer` class. The only abstraction provided is
root span locator - which is necessary in a single page web application.

# Development

- This repository is a [nx](https://nrwl.io/nx) / Angular CLI based repository
- The easiest way to develop is by running the end to end example using `yarn quick`.
- Tests are run via `karma` by running `yarn test`

Please see the open issues in the repo for discussion on bugs/enhancements.
