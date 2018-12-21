import { AfterViewInit, Component, OnInit } from '@angular/core';
import { LocalTracer, ZipkinTraceRoot } from '@angular-tracing/zipkin';
import { Observable } from 'rxjs';

import { Hero } from '../../core';
import { HeroService } from '../hero.service';

@Component({
  selector: 'app-heroes',
  templateUrl: './heroes.component.html'
})
export class HeroesComponent implements OnInit {
  selected: Hero | null;
  heroes$: Observable<Hero[]>;
  message = '?';
  heroToDelete: Hero | null;
  showModal = false;
  private tracer: LocalTracer;

  constructor(private heroService: HeroService, traceRoot: ZipkinTraceRoot) {
    this.heroes$ = heroService.entities$;
    this.tracer = traceRoot.localTracer();
  }

  ngOnInit() {
    this.getHeroes();
  }

  add(hero: Hero) {
    this.heroService.add(hero);
  }

  askToDelete(hero: Hero) {
    this.heroToDelete = hero;
    this.showModal = true;
    if (this.heroToDelete.name) {
      this.message = `Would you like to delete ${this.heroToDelete.name}?`;
    }
  }

  clear() {
    this.selected = null;
  }

  closeModal() {
    this.showModal = false;
  }

  deleteHero() {
    this.closeModal();
    if (this.heroToDelete && this.heroToDelete.id) {
      this.heroService.delete(this.heroToDelete).subscribe(() => (this.heroToDelete = null));
    }
    this.clear();
  }

  enableAddMode() {
    this.selected = <any>{};
  }

  getHeroes() {
    this.heroService.getAll();
    this.clear();
  }

  save(hero: Hero) {
    if (this.selected && this.selected.name) {
      this.update(hero);
    } else {
      this.add(hero);
    }
  }

  select(hero: Hero) {
    this.selected = hero;
  }

  update(hero: Hero) {
    this.heroService.update(hero);
  }
}
