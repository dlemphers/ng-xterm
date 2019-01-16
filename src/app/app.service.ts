import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

@Injectable()
export class AppService {
  constructor(
    private http: HttpClient
  ) {}

  getProcessId(cols: number, rows: number): Observable<any> {
    const url = `http://${this.baseUrl}/terminals`;
    return this.http.post(url, {}, {
      params: {
        cols: cols.toString(),
        rows: rows.toString()
      }
    });
  }

  get socketUrl(): string {
    const protocol = (location.protocol === 'https:') ? 'wss://' : 'ws://';

    return `${protocol}${this.baseUrl}/terminals/`;
  }

  private get baseUrl(): string {
    if (environment.production) {
      const port = location.port;

      return location.hostname + (port ? (':' + port) : '');
    }

    return 'localhost:3000'; // Server Port and Host
  }
}
