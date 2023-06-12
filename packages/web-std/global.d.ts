/// <reference types="@netlify/urlpattern-polyfill" />
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: "development" | "production" | "test";
    }

    interface GlobalThis {
      atob: typeof atob;
      btoa: typeof btoa;

      Blob: typeof Blob;
      File: typeof File;

      Headers: typeof NodeHeaders;
      Request: typeof NodeRequest;
      Response: typeof NodeResponse;
      fetch: typeof nodeFetch;
      FormData: typeof NodeFormData;

      ReadableStream: typeof NodeReadableStream;
      WritableStream: typeof NodeWritableStream;

      AbortController: typeof NodeAbortController;

      URLPattern: typeof NodeURLPattern;

      crypto: typeof crypto;
    }
  }
}