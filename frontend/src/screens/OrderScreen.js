import React, { useState, useEffect } from "react";
import axios from "axios";
import { PayPalButton } from "react-paypal-button-v2";
import { Link } from "react-router-dom";
import { Row, Col, ListGroup, Image, Card, Button } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import Message from "../components/Message";
import Loader from "../components/Loader";
import {
  getOrderDetails,
  payOrder,
  deliverOrder,
} from "../actions/orderActions";
import {
  ORDER_PAY_RESET,
  ORDER_DELIVER_RESET,
} from "../constants/orderConstants";
import { listProductDetails } from "../actions/productActions";
import StripeButton from "../components/StripeButton";
import Googlepay from "../components/Googlepay";

const OrderScreen = ({ match, history }) => {
  const orderId = match.params.id;

  const [sdkReady, setSdkReady] = useState(false);
  const [coupon, setCoupon] = useState("");
  const [couponPrice, setCouponPrice] = useState(0);

  const dispatch = useDispatch();

  const orderDetails = useSelector((state) => state.orderDetails);
  const { order, loading, error } = orderDetails;

  const orderPay = useSelector((state) => state.orderPay);
  const { loading: loadingPay, success: successPay } = orderPay;

  const orderDeliver = useSelector((state) => state.orderDeliver);
  const { loading: loadingDeliver, success: successDeliver } = orderDeliver;

  const userLogin = useSelector((state) => state.userLogin);
  const { userInfo } = userLogin;

  if (!loading && order) {
    //   Calculate prices
    const addDecimals = (num) => {
      return (Math.round(num * 100) / 100).toFixed(2);
    };

    order.itemsPrice = addDecimals(
      order.orderItems.reduce((acc, item) => acc + item.price * item.qty, 0)
    );
  }

  useEffect(() => {
    if (!userInfo) {
      history.push("/login");
    }

    const addPayPalScript = async () => {
      const { data: clientId } = await axios.get("/api/config/paypal");
      const script = document.createElement("script");
      script.type = "text/javascript";
      script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}`;
      script.async = true;
      script.onload = () => {
        setSdkReady(true);
      };
      document.body.appendChild(script);
    };

    if (!order || successPay || successDeliver || order._id !== orderId) {
      dispatch({ type: ORDER_PAY_RESET });
      dispatch({ type: ORDER_DELIVER_RESET });
      dispatch(getOrderDetails(orderId));
    } else if (!order.isPaid) {
      if (!window.paypal) {
        addPayPalScript();
      } else {
        setSdkReady(true);
      }
    }
  }, [dispatch, orderId, successPay, successDeliver, order]);

  const successPaymentHandler = (paymentResult) => {
    console.log(paymentResult);
    dispatch(payOrder(orderId, paymentResult));
  };

  const deliverHandler = () => {
    dispatch(deliverOrder(order));
  };

  const handleApplyCoupon = () => {
    if (coupon === "firstPARK") {
      setCouponPrice(Math.round(order.totalPrice / 1.66));
    }
  };

  return loading ? (
    <Loader />
  ) : error ? (
    <Message variant="danger">{error}</Message>
  ) : (
    <>
      <Row className="my-3">
        <Col md={8}>
          <ListGroup variant="flush">
            <ListGroup.Item>
              <h2>Booking</h2>
              <p>
                <strong>Name: </strong> {order.user.name}
              </p>
              <p>
                <strong>Email: </strong>{" "}
                <a href={`mailto:${order.user.email}`}>{order.user.email}</a>
              </p>
              <p>
                <strong>Phone: </strong> +91 {order.user.phone}
              </p>
              <p>
                <strong>User Details:</strong>
                <hr />
                <p>
                  <strong>Vehicle Name</strong>: {order.shippingAddress.address}
                </p>
                <p>
                  <strong>Mobile Number</strong>: {order.shippingAddress.city}
                </p>
                <p>
                  <strong>Vehicle Number</strong>:{" "}
                  {order.shippingAddress.postalCode}
                </p>
                <p>
                  <strong>Adhaar Number</strong>:{" "}
                  {order.shippingAddress.country}
                </p>
              </p>
              {order.isDelivered ? (
                <Message variant="success">
                  Booked on {order.deliveredAt}
                </Message>
              ) : (
                <Message variant="danger">Not Yet Booked</Message>
              )}
            </ListGroup.Item>

            <ListGroup.Item>
              <h2>Payment Method</h2>
              <p>
                <strong>Method: </strong>
                {order.paymentMethod}
              </p>
              {order.isPaid ? (
                <Message variant="success">Paid on {order.paidAt}</Message>
              ) : (
                <Message variant="danger">Not Paid</Message>
              )}
            </ListGroup.Item>

            <ListGroup.Item>
              <h2>Order Items</h2>
              {order.orderItems.length === 0 ? (
                <Message>Order is empty</Message>
              ) : (
                <ListGroup variant="flush">
                  {order.orderItems.map((item, index) => (
                    <>
                      <ListGroup.Item key={index}>
                        <Row>
                          <Col md={1}>
                            <Image
                              src={item.image}
                              alt={item.name}
                              fluid
                              rounded
                            />
                          </Col>
                          <Col>
                            <Link to={`/product/${item.product}`}>
                              {item.name}
                            </Link>
                          </Col>
                          <Col md={4}>
                            {item.qty} x {item.price} Rs ={" "}
                            {item.qty * item.price} INR
                          </Col>
                        </Row>
                      </ListGroup.Item>
                    </>
                  ))}
                </ListGroup>
              )}
            </ListGroup.Item>
          </ListGroup>
        </Col>
        <Col md={4}>
          <Card>
            <ListGroup variant="flush">
              <ListGroup.Item>
                <h2>Order Summary</h2>
              </ListGroup.Item>
              <ListGroup.Item>
                <Row>
                  <Col>Items</Col>
                  <Col>{order.itemsPrice} Rs</Col>
                </Row>
              </ListGroup.Item>

              <ListGroup.Item>
                <Row>
                  <Col>Tax</Col>
                  <Col>{order.taxPrice} Rs</Col>
                </Row>
              </ListGroup.Item>

              <ListGroup.Item>
                <Row>
                  <Col>Total</Col>
                  <Col>
                    INR {couponPrice === 0 ? order.totalPrice : couponPrice}
                  </Col>
                </Row>
              </ListGroup.Item>
              <ListGroup.Item>
                <Row>
                  <Col sm={4}>Use Coupons.</Col>
                  <Col sm={8}>
                    <input
                      type="text"
                      value={coupon}
                      onChange={(e) => setCoupon(e.target.value)}
                    />
                    <Button
                      className="btn-sm btn-outline"
                      onClick={handleApplyCoupon}
                    >
                      Apply
                    </Button>
                  </Col>
                </Row>
                <Row>
                  <Col className="text-center">
                    {coupon !== "firstPARK"
                      ? "Coupon Invalid"
                      : "Coupon is valid please click apply to verify"}
                  </Col>
                </Row>
              </ListGroup.Item>
              {!order.isPaid && (
                <ListGroup.Item>
                  {loadingPay && <Loader />}
                  {!sdkReady ? (
                    <Loader />
                  ) : (
                    <PayPalButton
                      amount={Number(
                        (couponPrice === 0 ? order.totalPrice : couponPrice) /
                          73.6
                      ).toFixed(2)}
                      onSuccess={successPaymentHandler}
                    />
                  )}
                </ListGroup.Item>
              )}
              {!order.isPaid && (
                <ListGroup.Item style={{ textAlign: "center" }}>
                  <h4 className="text-muted">
                    <i>STRIPE </i> Card payments
                  </h4>
                  <StripeButton
                    price={couponPrice === 0 ? order.totalPrice : couponPrice}
                  />
                </ListGroup.Item>
              )}
              {!order.isPaid && (
                <ListGroup.Item style={{ textAlign: "center" }}>
                  <h4 className="text-muted">Google pay</h4>
                  <Googlepay
                    price={couponPrice === 0 ? order.totalPrice : couponPrice}
                  />
                </ListGroup.Item>
              )}
              {loadingDeliver && <Loader />}
              {userInfo &&
                userInfo.isAdmin &&
                order.isPaid &&
                !order.isDelivered && (
                  <ListGroup.Item>
                    <Button
                      type="button"
                      className="btn btn-block"
                      onClick={deliverHandler}
                    >
                      Provider set Booked
                    </Button>
                  </ListGroup.Item>
                )}
            </ListGroup>
          </Card>
        </Col>
      </Row>
    </>
  );
};

export default OrderScreen;
