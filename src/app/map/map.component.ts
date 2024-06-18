import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { GridModule } from '@progress/kendo-angular-grid';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule, GridModule, FormsModule],
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css']
})
export class LeafletComponent implements OnInit {
  map: any;
  domainData: { domainId: number, domainName: string }[] = [];
  gridData: any[] = [];
  selectedDomainId: string | null = null;
  gridVisible: boolean = false;
  gridColumns: string[] = [];
  domainSelected = false;
  markerIcons: { [key: string]: L.Icon } = {};
  markers: { [key: string]: L.Marker } = {};
  highlightedMarker: L.Marker | null = null;
  gifOverlays: { [key: string]: L.Marker } = {};
  selectedCheckboxes: { [key: string]: boolean } = {};
  selectedData: any = null;
  originalGridData: any[] = [];
  searchTerm: string = '';
  transportationTypes: string[] = [];
  selectedTransportDomainId: boolean = false;
  markerClusterGroup: any;
  private L: any;

  constructor(private http: HttpClient) { }

  async ngOnInit() {

    if (typeof window !== undefined) {
      this.callApi();
      this.loadMarkerIcons();
      const { default: L } = await import('leaflet');
      await import('leaflet.markercluster');
      this.L = L;
      this.initMap(L);
    }
  }

  initMap(L: any): void {
    this.map = L.map('map').setView([23.5937, 78.9629], 6)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);
    this.markerClusterGroup = this.L.markerClusterGroup();
    this.map.addLayer(this.markerClusterGroup);
    this.updateMapMarkers();
  }

  loadMarkerIcons(): void {
    this.markerIcons['default'] = L.icon({
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      shadowSize: [41, 41]
    });
  }

  callApi(): void {
    this.http.get<any[]>('http://localhost:5286/api/Home/domainmasters').subscribe(

      (data: any[]) => {
        this.domainData = data?.map((item: any) => ({ domainId: item.domainId, domainName: item.domainName })) ?? [];
      },
      (error: any) => {
        console.error('API Error:', error);
      }
    );
  }

  onDomainSelected(event: Event): void {
    const selectedDomainId = (event.target as HTMLSelectElement).value;
    this.domainSelected = true;
    this.gridVisible = false;
    this.transportationTypes = [];
    this.selectedData = null;
    this.map.eachLayer((layer: any) => {
      if (layer instanceof L.Marker) {
        this.map.removeLayer(layer);
      }
    });
    const desiredZoomLevel = 6;
    this.map.setZoom(desiredZoomLevel);
    switch (selectedDomainId) {
      case '1':
        this.selectedTransportDomainId = true;
        this.gridColumns = ['areaName', 'registrationNo', 'speed', 'transportationType'];
        break;
      case '2':
        this.selectedTransportDomainId = false;
        this.gridColumns = ['areaName', 'aqi'];
        break;
      case '3':
        this.selectedTransportDomainId = false;
        this.gridColumns = ['areaName', 'isWorking'];
        break;
      default:
        this.gridColumns = [];
    }

    this.http.get<any>('http://localhost:5286/api/Home/masters/' + selectedDomainId).subscribe(
      (data: any[]) => {
        this.gridData = data;
        this.originalGridData = data;
        console.log(typeof (selectedDomainId));
        if (selectedDomainId === '1') {
          this.transportationTypes = Array.from(new Set(data.map(item => item.transportationType)));
          this.http.get<any>('http://localhost:5286/api/Home/GetAllIncidents').subscribe(
            (incidents: any[]) => {
              const incidentData = incidents.reduce((acc, incident) => {
                const vehicleNumber = incident.vehicleNumber;
                if (!acc[vehicleNumber]) {
                  acc[vehicleNumber] = { count: 0, incidentDetails: [] };
                }
                acc[vehicleNumber].count++;
                acc[vehicleNumber].incidentDetails.push({ startTime: incident.startTime, endTime: incident.endTime });
                // console.log(typeof(incident.startTime));
                return acc;
              }, {});
              // console.log("incidentData"+incidentData);
              this.gridData = this.gridData.map(item => {
                const vehicleNumber = item.registrationNo;
                const extraData = incidentData[vehicleNumber];
                // console.log("extraData"+extraData.startTime);
                if (extraData) {
                  return {
                    ...item,
                    incidents: extraData.count,
                    incidentDetails: extraData.incidentDetails
                  };
                } else {
                  return {
                    ...item,
                    incidents: 0,
                    incidentDetails: []
                  };
                }
              });
              // console.log('Final Grid Data:', this.gridData);
              this.updateMapMarkers(this.gridData);
            },
            (error: any) => {
              console.error('Incidents API Error:', error);
            },
          );
        };
      },
    );
  }
  onTransportationTypeSelected(event: Event): void {
    const selectedType = (event.target as HTMLSelectElement).value;
    if (selectedType) {
      const filteredData = this.originalGridData.filter(item => item.transportationType === selectedType);
      this.gridData = filteredData;
      this.updateMapMarkers(filteredData);
    } else {
      this.gridData = this.originalGridData;
      this.updateMapMarkers(this.originalGridData);
    }
  }
  onSearch(event: Event): void {
    const searchTerm = (event.target as HTMLInputElement).value.toLowerCase();
    this.gridData = this.originalGridData.filter(item =>
      this.gridColumns.some(column => item[column]?.toString().toLowerCase().includes(searchTerm))
    );
  }
  clearSearch(): void {
    this.searchTerm = '';
    this.gridData = [...this.originalGridData];
  }

  updateMapMarkers(data?: any[]): void {
    if (!this.markerClusterGroup) {
      this.markerClusterGroup = L.markerClusterGroup();
      this.map.addLayer(this.markerClusterGroup);
    }
    this.markerClusterGroup.clearLayers();
    this.markers = {};
    this.gifOverlays = {};
    data?.forEach((element: any) => {
      const longitude = element.longitude;
      const latitude = element.latitude;
      const marker = L.marker([latitude, longitude])
        .setIcon(this.markerIcons['default'])
      this.markerClusterGroup.addLayer(marker);
      this.markers[element.id] = marker;

      marker.on('click', () => {
        const selectedData = {
          ...element,
          numberOfIncidents: element.incidents,
          incidentDetails: element.incidentDetails || []
        };

        this.selectedData = selectedData;
        console.log("selecteddata", this.selectedData);
        this.openPopupWithDetails(selectedData);
      });
    });
    // this.map.on('zoomend', () => {
    //   const zoomLevel = this.map.getZoom();
    //   const threshold = 10; 
    //   if (zoomLevel > threshold) {
    //     this.map.removeLayer(this.markerClusterGroup);
    //     Object.values(this.markers).forEach((marker: any) => {
    //       this.map.addLayer(marker);
    //     });
    //   } else {
    //     this.map.addLayer(this.markerClusterGroup);
    //     Object.values(this.markers).forEach((marker: any) => {
    //       this.map.removeLayer(marker);
    //     });
    //   }
    // });
    this.markerClusterGroup.on('clusterclick', (event: any) => {
      const cluster = event.layer;
      this.map.fitBounds(cluster.getBounds());
    });
  }
  // toggleSections(section:any) {
  //   const detailsSection = document.querySelector('.details-section');
  //   const incidentDetailsSection = document.querySelector('.incident-details-section');
  //   if (section === 'details') {
  //     (detailsSection:null,style:any,display:any)=>'block';
  //     (incidentDetailsSection:null,style:any,display:any)=>'none';
  //     // incidentDetailsSection.style.display = 'none';
  //   } else {
  //     (detailsSection:null,style:any,display:any)=>'none';
  //     (incidentDetailsSection:null,style:any,display:any)=>'block';
  //     // detailsSection.style.display = 'none';
  //     // incidentDetailsSection.style.display = 'block';
  //     // setTimeout(() => initializeKendoGrid(${JSON.stringify(selectedData.incidentDetails)}), 0);
  //   }
  // }
  // Define the function in the global scope

  openPopupWithDetails(selectedData: any): void {
    console.log("selectedData" + selectedData);
    (window as any).showIncidentDetails = () => {
      // Show the incident details section
      const incidentDetailsSection = document.querySelector('.incident-details-section') as HTMLElement;
      incidentDetailsSection.style.display = 'block';
      const DetailsSection = document.querySelector('.details-section-only') as HTMLElement;
      DetailsSection.style.display = 'none';
      const incidentDetailsButton = document.querySelector('.incident-details-button') as HTMLElement;
      incidentDetailsButton.classList.add('active');
      const DetailsButton = document.querySelector('.details-button') as HTMLElement;
      DetailsButton.classList.remove('active');
    };
    (window as any).showDetails = () => {
      // Show the incident details section
      const incidentDetailsSection = document.querySelector('.incident-details-section') as HTMLElement;
      incidentDetailsSection.style.display = 'none';
      // incidentDetailsSection.style.max-height = 'block';

      const DetailsSection = document.querySelector('.details-section-only') as HTMLElement;
      DetailsSection.style.display = 'block';
      const incidentDetailsButton = document.querySelector('.incident-details-button') as HTMLElement;
      incidentDetailsButton.classList.remove('active');
      const DetailsButton = document.querySelector('.details-button') as HTMLElement;
      DetailsButton.classList.add('active');
    };
    const popupContent = `
      <div class="popup-container">
        <div class="details-section">
          <button class='details-button active' onclick="showDetails()">View Details</button>
          <button class=' incident-details-button'onclick="showIncidentDetails()">View Incident Details</button>
          <div class="details-section-only">
          <p><b>Area Name:</b> ${selectedData.areaName}</p>
          <p><b>Vehicle No:</b> ${selectedData.registrationNo}</p>
          <p><b>Speed:</b> ${selectedData.speed}</p>
          <p><b>Transportation Type:</b> ${selectedData.transportationType}</p>
          <p><b> Total No. of Incidents:</b> ${selectedData.incidents}</p>
        </div>
        <div class="incident-details-section" style="display: none;">
        <div class="container">
    <div class="row">
        <div class="col-md-12">
        <div>
        <p>No. of incidents today : <b id="numberOfIncidentsToday"></b></p></div>
            <table class="table table-bordered table-striped">
                <thead class="thead-dark">
                    <tr>
                        <th>Start Time</th>
                        <th>End Time</th>
                    </tr>
                </thead>
                <tbody id="incidentDetailsTableBody"></tbody>
            </table>
        </div>
    </div>
    </div>
    </div>
    </div>
      </div>
      <style>
        .popup-container {
          display: flex;
          flex-direction: row;
          width: 100%;
        }
        .details-section {
          flex: 1;
          width: 100%;
        }
      table {
        margin-top:5px;
          width: 100%;
          border-collapse: collapse;
      }
      th, td {
          padding: 10px;
          text-align: left;
      }
      .details-button, .incident-details-button{
        padding: 2px 2px;
        margin:2px;
        cursor: pointer;
        background-color: transparent;
        border: none;
        text-decoration: none;
        color: #6b9cd0;
        border-bottom: 2px solid transparent;
    }
    .details-button:hover,.incident-details-button:hover,.active {
        border-bottom-color: #6b9cd0;
    }
      .incident-details-section {
        margin-top:3px;
          max-height: 200px; /* Set a fixed height */
          overflow-y: auto; /* Enable vertical scrolling */
      }
      </style>
      <script>
      
      </script>
      `;
    //document.getElementById('popupContainer')!.innerHTML = popupContent;
    requestAnimationFrame(() => {
      const today = new Date().toISOString().slice(0, 10);
      const todaysIncidents = selectedData.incidentDetails.filter((detail: any) => {
        const incidentDate = new Date(detail.startTime).toISOString().slice(0, 10);
        return incidentDate === today;
      });
      // Populate the table with incident details
      const tableBody = document.getElementById('incidentDetailsTableBody')!;
      selectedData.incidentDetails.forEach((detail: any) => {
        const incidentDate = new Date(detail.startTime).toISOString().slice(0, 10);
        if (incidentDate === today) {
          const startTime = new Date(detail.startTime).toLocaleTimeString('en-US', { hour12: true, hour: 'numeric', minute: 'numeric', second: 'numeric' });
          const endTime = new Date(detail.endTime).toLocaleTimeString('en-US', { hour12: true, hour: 'numeric', minute: 'numeric', second: 'numeric' });
          const row = document.createElement('tr');
          row.innerHTML = `<td>${startTime}</td><td>${endTime}</td>`;;
          console.log("selectedData.incidentDetails" + startTime);
          tableBody.appendChild(row);
        }
        const numberOfIncidentsToday = todaysIncidents.length;
        document.getElementById('numberOfIncidentsToday')!.textContent = numberOfIncidentsToday.toString();
      });

    });
    const popup = L.popup()
      .setLatLng([selectedData.latitude, selectedData.longitude])
      .setContent(popupContent)
      .openOn(this.map);
  }

  // initializeKendoGrid(incidentDetails:any) {
  //   //const gridElement = document.getElementById("incidentDetailsGrid");
  //   //if (gridElement) {
  //     $("#incidentDetailsGrid").kendoGrid({
  //       dataSource: {
  //         data: incidentDetails.map((incident:any) => ({
  //           startTime: new Date(incident.startTime),
  //           endTime: new Date(incident.endTime)
  //         })),
  //         schema: {
  //           model: {
  //             fields: {
  //               startTime: { type: "date" },
  //               endTime: { type: "date" }
  //             }
  //           }
  //         }
  //       },
  //       columns: [
  //         { field: "startTime", title: "Start Time", format: "{0:MM/dd/yyyy HH:mm}" },
  //         { field: "endTime", title: "End Time", format: "{0:MM/dd/yyyy HH:mm}" }
  //       ]
  //     });
  //    }

  toggleGrid(): void {
    this.gridVisible = !this.gridVisible;
  }

  onCheckboxClick(dataItem: any, event: Event): void {
    const isChecked = (event.target as HTMLInputElement).checked;
    this.selectedCheckboxes[dataItem.id] = isChecked;
    if (isChecked) {
      this.toggleGifOverlay(dataItem);
      this.zoomInMarker(dataItem);
    } else {
      this.toggleGifOverlay(dataItem);
      this.zoomOutMarker();
    }
  }
  onSelectAll(event: any): void {
    const isChecked = event.target.checked;
    this.gridData.forEach(dataItem => {
      if (isChecked) {
        if (this.gifOverlays[dataItem.id]) {
          console.log("removedlayer of id: " + dataItem.id)
          this.map.removeLayer(this.gifOverlays[dataItem.id]);
          delete this.gifOverlays[dataItem.id];
        }
        this.selectedCheckboxes[dataItem.id] = true;
        this.toggleGifOverlay(dataItem);
      } else {
        this.selectedCheckboxes[dataItem.id] = false;
        this.toggleGifOverlay(dataItem);
      }
    });
    if (!isChecked) {
      this.zoomOutMarker();
    }
  }

  toggleGifOverlay(dataItem: any): void {
    const marker = this.markers[dataItem.id];
    if (!marker) return;
    if (this.gifOverlays[dataItem.id]) {
      this.map.removeLayer(this.gifOverlays[dataItem.id]);
      console.log(dataItem.id);
      delete this.gifOverlays[dataItem.id];
    } else {
      console.log("inside else: " + dataItem.id);
      const gifIcon = L.divIcon({
        className: 'gif-icon',
        html: `<img src="assets/giphy.gif" style="width: 32px; height: 64px;" class="gif-icon" />`,
        iconSize: [32, 64],
        iconAnchor: [16, 64]
      });
      const gifMarker = L.marker(marker.getLatLng(), { icon: gifIcon }).addTo(this.map);
      gifMarker.setZIndexOffset(1000);
      this.gifOverlays[dataItem.id] = gifMarker;
      gifMarker.on('click', () => {
        this.openPopupWithDetails(dataItem);
      });
    }
  }

  zoomInMarker(dataItem: any): void {
    const marker = this.markers[dataItem.id];
    if (marker) {
      this.map.flyTo(marker.getLatLng(), 15, {
        animate: true,
        duration: 2.0 // duration in seconds
      });
    }
  }
  zoomOutMarker(): void {
    this.map.setView([23.5937, 78.9629], 6);
  }
  clearCheckboxSelection(): void {
    this.selectedCheckboxes = {};
  }
  ngAfterViewInit(): void {
    this.removeKendoInvalidLicance();
  }

  removeKendoInvalidLicance() {
    setTimeout(() => {
      const banner = Array.from(document.querySelectorAll('div')).find((el) =>
        el.textContent?.includes('No valid license found for Kendo UI for Angular')
      );
      if (banner) banner.remove();
      const watermarkElement = document.querySelector('div[kendowatermarkoverlay]');
      if (watermarkElement) {
        watermarkElement.remove();
        console.log('Watermark removed successfully.');
      } else {
        console.log('Watermark element not found.');
      }
    }, 0);
  }

}
