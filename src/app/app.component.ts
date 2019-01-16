import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
import { fromEvent, Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';

import * as Terminal from 'xterm/dist/xterm';
import * as attach from 'xterm/lib/addons/attach/attach';
import * as fit from 'xterm/lib/addons/fit/fit';
import * as search from 'xterm/lib/addons/search/search';
import * as webLinks from 'xterm/lib/addons/webLinks/webLinks';
import * as winptyCompat from 'xterm/lib/addons/winptyCompat/winptyCompat';
import * as fullscreen from 'xterm/lib/addons/fullscreen/fullscreen';
import { AppService } from './app.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent implements OnInit, OnDestroy {
  socketURL: string;
  socket: WebSocket;

  @ViewChild('terminal') container: ElementRef;

  private term: Terminal;
  private ngUnsubscribe: Subject<any> = new Subject();

  constructor(
    private service: AppService
  ) {}

  ngOnInit(): void {
    this.createTerminal();
    fromEvent(window, 'resize')
      .pipe(
        debounceTime(100),
        takeUntil(this.ngUnsubscribe)
      )
      .subscribe(() => {
        this.recreateTerminal();
      });
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  private createTerminal(): void {
    this.applyAddons();
    this.initTerminal();
    this.socketURL = this.service.socketUrl;
    this.initWebSocket();
  }

  private recreateTerminal(): void {
    while (this.container.nativeElement.children.length) {
      this.container.nativeElement.removeChild(this.container.nativeElement.children[0]);
    }

    this.createTerminal();
  }

  private applyAddons(): void {
    Terminal.applyAddon(attach);
    Terminal.applyAddon(fit);
    Terminal.applyAddon(fullscreen);
    Terminal.applyAddon(search);
    Terminal.applyAddon(webLinks);
    Terminal.applyAddon(winptyCompat);
  }

  private initTerminal(): void {
    this.term = new Terminal();
    this.term.open(this.container.nativeElement);
    this.term.winptyCompatInit();
    this.term .webLinksInit();
    this.setPadding();
    this.term.focus();
  }

  private setPadding(): void {
    this.term.element.style.padding = '10px';
    this.term.fit();
  }

  private initWebSocket(): void {
    this.service.getProcessId(this.term.cols, this.term.rows)
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe(processId => {
        this.socketURL += processId;
        this.socket = new WebSocket(this.socketURL);
        this.socket.onopen = this.runRealTerminal.bind(this);
        this.socket.onclose = this.runFakeTerminal.bind(this);
        this.socket.onerror = this.runFakeTerminal.bind(this);
      });
  }

  private runRealTerminal(): void {
    this.term.clear();
    this.term.attach(this.socket);
    this.term._initialized = true;
  }

  private runFakeTerminal(): void {
    if (this.term._initialized) {
      return;
    }

    this.term._initialized = true;

    this.term.prompt = () => {
      this.term.write('\r\n$ ');
    };

    this.term.clear();
    this.term.writeln('Welcome to xterm.js');
    this.term.writeln('This is a local terminal emulation, without a real terminal in the back-end.');
    this.term.writeln('Type some keys and commands to play around.');
    this.term.writeln('');
    this.term.prompt();

    this.term._core.register(this.term.addDisposableListener('key', (key, ev) => {
      const printable = !ev.altKey && !ev.altGraphKey && !ev.ctrlKey && !ev.metaKey;

      if (ev.key === 'Enter' || ev.code === 'Enter') {
        this.term.prompt();
      } else if (ev.key === 'Backspace' || ev.code === 'Backspace') {
        // Do not delete the prompt
        if (this.term.x > 2) {
          this.term.write('\b \b');
        }
      } else if (printable) {
        this.term.write(key);
      }
    }));

    this.term._core.register(this.term.addDisposableListener('paste', (data, ev) => {
      this.term.write(data);
    }));
  }
}
