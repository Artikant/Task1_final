/// <reference types="@angular/localize" />

import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { AppComponent } from './app/app.component';
import { HttpClientModule } from '@angular/common/http';
bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient(withFetch())
  ],
  
}).catch(err => console.error(err));
