import { useState } from 'react';
import Button from '@cloudscape-design/components/button';
import Container from '@cloudscape-design/components/container';
import ContentLayout from '@cloudscape-design/components/content-layout';
import Form from '@cloudscape-design/components/form';
import FormField from '@cloudscape-design/components/form-field';
import Header from '@cloudscape-design/components/header';
import Input from '@cloudscape-design/components/input';
import Select from '@cloudscape-design/components/select';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Textarea from '@cloudscape-design/components/textarea';
import { PRODUCTS, findProduct, isApproved } from '../../shared/catalog.js';
import { COPY } from '../../shared/copy.js';
import { ROUTES } from '../../shared/productRoutes.js';
import { CHECK } from '../../shared/requestChecks.js';
import { resolveSubmit } from '../../shared/submitRequest.js';
import { navigate, useLocation } from '../router.js';
import { RequestNotSentError, useStore } from '../state/store.jsx';

// Draft copy for each failed check. The spec has no form error copy yet.
const FORM_ERRORS = {
  [CHECK.REQUESTS_OFF]: 'Product requests are turned off in your Private Marketplace. To ask about this product, speak with your administrator.',
  [CHECK.APPROVED]: 'This product is already approved for purchase in your Private Marketplace.',
  [CHECK.DECLINED_BLOCKED]: "This product can't be requested.",
  [CHECK.DUPLICATE]: 'You already sent a request for this product. View its status in Product requests.',
  [CHECK.NOT_FOUND]: 'Product is required.',
};

// Backup request form (decided Nov 13 and 14). A stand-in: we don't know the real form's layout.
// Fields from the AWS buyer docs: Product (read-only when known), Reason for request, PO number (optional).
// It runs the same checks as the agent and saves the same way (Supabase, or the browser session when
// storage is off).
export default function RequestForm() {
  const { params } = useLocation();
  const { buyer, experience, myRequests, saveRequest } = useStore();
  const known = findProduct(params.get('product') ?? '');
  const [productId, setProductId] = useState(known?.product_id ?? '');
  const [reason, setReason] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');

  const options = PRODUCTS.filter((p) => !isApproved(p, experience.id)).map((p) => ({ label: p.name, value: p.product_id }));
  const selected = options.find((o) => o.value === productId) ?? null;

  const submit = async () => {
    const fieldErrors = {};
    if (!productId) fieldErrors.product = 'Product is required.';
    if (!reason.trim()) fieldErrors.reason = 'Reason for request is required.';
    setErrors(fieldErrors);
    setFormError('');
    if (Object.keys(fieldErrors).length) return;

    const result = resolveSubmit({
      card: { productId, note: reason, poNumber },
      buyer, experience, requests: myRequests, products: PRODUCTS,
    });
    if (result.outcome !== 'submitted') {
      setFormError(FORM_ERRORS[result.reason]);
      return;
    }
    try {
      await saveRequest(result.record);
      navigate(ROUTES.productRequests);
    } catch (error) {
      // The server's check did not pass: the same message as the browser's check.
      if (error instanceof RequestNotSentError && FORM_ERRORS[error.reason]) {
        setFormError(FORM_ERRORS[error.reason]);
        return;
      }
      setFormError(`Your request for ${result.product.name} wasn't sent because of a connection error. Try again.`);
    }
  };

  return (
    <ContentLayout header={<Header variant="h1">{COPY.formTitle}</Header>}>
      <form onSubmit={(event) => { event.preventDefault(); submit(); }}>
        <Form
          errorText={formError || undefined}
          actions={
            <SpaceBetween direction="horizontal" size="xs">
              <Button formAction="none" variant="link" onClick={() => window.history.length > 1 ? window.history.back() : navigate(ROUTES.myPrivateMarketplace)}>
                {COPY.cancel}
              </Button>
              <Button variant="primary">{COPY.submitRequest}</Button>
            </SpaceBetween>
          }
        >
          <Container header={<Header variant="h2">Request details</Header>}>
            <SpaceBetween size="l">
              <FormField label={COPY.formProduct} errorText={errors.product}>
                {known ? (
                  <Input value={known.name} readOnly ariaLabel={COPY.formProduct} />
                ) : (
                  <Select
                    selectedOption={selected}
                    options={options}
                    filteringType="auto"
                    placeholder="Choose a product"
                    onChange={({ detail }) => setProductId(detail.selectedOption.value)}
                  />
                )}
              </FormField>
              <FormField label={COPY.formReason} errorText={errors.reason}>
                <Textarea value={reason} onChange={({ detail }) => setReason(detail.value)} />
              </FormField>
              <FormField label={<span>{COPY.formPoNumber} <i>- {COPY.formOptional}</i></span>}>
                <Input value={poNumber} onChange={({ detail }) => setPoNumber(detail.value)} />
              </FormField>
            </SpaceBetween>
          </Container>
        </Form>
      </form>
    </ContentLayout>
  );
}
