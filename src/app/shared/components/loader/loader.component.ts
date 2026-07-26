import { Component, inject } from '@angular/core';
import { UiService } from '../../services/ui.service';

@Component({
  selector: 'app-loader',
  standalone: false,
  templateUrl: './loader.component.html',
  styleUrl: './loader.component.scss',
})
export class Loader {
  private readonly uiService = inject(UiService);
  readonly loading$ = this.uiService.loading$;
}
