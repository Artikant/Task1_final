import { Component } from '@angular/core';
// import { RouterOutlet } from '@angular/router';
import { LeafletComponent } from './map/map.component';
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [LeafletComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'Task_1';
}
