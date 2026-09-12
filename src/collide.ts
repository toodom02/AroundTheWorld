import * as CANNON from 'cannon-es';

export type CollideEvent = {
  type: string;
  body: CANNON.Body;
  contact: CANNON.ContactEquation;
};
