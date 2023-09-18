export type ApplicationError = {
  name: string;
  message: string;
};


export type RequestError = {
  status: number;
  data: object | null;
  statusText: string;
  name: string;
  message: string;
};


export type RawErrorViaCEP = {
  data: {
    erro: true;
  }
}


export type ViaCEPAddressResponse = {
  data: {
    cep: "string";
    logradouro: "string";
    complemento: "string";
    bairro: "string";
    localidade: "string";
    uf: "string";
    ibge: "string";
    gia: "string";
    ddd: "string";
    siafi: "string";
  }
}


export type ObjectViaCEP = {
  logradouro: "string";
  complemento: "string";
  bairro: "string";
  cidade: "string";
  uf: "string";
}
 //não esquecer de exportar os tipos!
export type ResponseViaCEP = RawErrorViaCEP | ViaCEPAddressResponse;
