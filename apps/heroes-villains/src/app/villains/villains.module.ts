import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ZipkinModule } from '@angular-tracing/zipkin';

import { SharedModule } from '../shared/shared.module';
import { VillainDetailComponent } from './villain-detail/villain-detail.component';
import { VillainListComponent } from './villain-list/villain-list.component';
import { VillainsComponent } from './villains/villains.component';

const routes: Routes = [
  {
    path: '',
    component: VillainsComponent
  }
];

@NgModule({
  imports: [CommonModule, RouterModule.forChild(routes), SharedModule, ZipkinModule],
  exports: [RouterModule, VillainsComponent],
  declarations: [VillainsComponent, VillainListComponent, VillainDetailComponent]
})
export class VillainsModule {}
