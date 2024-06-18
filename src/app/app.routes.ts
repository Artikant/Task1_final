import { Routes } from '@angular/router';
import {LeafletComponent} from  './map/map.component';
export const routes: Routes = [
    {
        path:'',
        redirectTo: 'leaflet',
        pathMatch:'full'
    },
    {
        path:'leaflet',
        component: LeafletComponent
    }
];