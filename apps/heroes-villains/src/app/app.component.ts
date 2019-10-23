import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  get test(): string {
    console.log(`Date.now: ${Date.now().toString()}`);
    return 'test';
  }
}
