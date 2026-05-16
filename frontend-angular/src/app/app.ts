import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from './navbar/navbar';
import { ApiService } from './services/api.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Navbar],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  private api = inject(ApiService);

  ngOnInit() {
    // Despierta Railway en cuanto carga la app para que las páginas internas no esperen
    this.api.get('/health').subscribe({ error: () => {} });
  }
}
